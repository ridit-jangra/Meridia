import { logger } from "./core/logger.js";
import { CompletionCache } from "./common/classes/cache.js";
import { CompletionFormatter } from "./common/classes/formatter.js";
import { CompletionRange } from "./common/classes/range.js";
import {
  DEFAULT_ALLOW_FOLLOW_UP_COMPLETIONS,
  DEFAULT_ENABLE_CACHING,
  DEFAULT_ON_DEMAND_DEBOUNCE,
  DEFAULT_ON_IDLE_DEBOUNCE,
  DEFAULT_ON_TYPING_DEBOUNCE,
  DEFAULT_TRIGGER,
} from "./defaults.js";
import {
  buildCompletionMetadata,
  requestCompletionItem,
} from "./requestCompletion.js";
import {
  type CompletionMetadata,
  type InlineCompletionProcessorParams,
  TriggerEnum,
} from "./types/core.js";
import type {
  FetchCompletionItemParams,
  FetchCompletionItemReturn,
} from "./types/internal.js";
import type { EditorInlineCompletionsResult } from "./types/monaco.js";
import { asyncDebounce } from "./common/utils/async-debounce.js";
import { getTextBeforeCursor } from "./common/utils/editor.js";
import { isCancellationError } from "./common/utils/error.js";
import { createInlineCompletionResult } from "./common/utils/result.js";

export const completionCache = new CompletionCache();

export const processInlineCompletions = async ({
  monaco,
  mdl,
  pos,
  token,
  isCompletionAccepted,
  options,
}: InlineCompletionProcessorParams): Promise<EditorInlineCompletionsResult> => {
  const {
    trigger = DEFAULT_TRIGGER,
    enableCaching = DEFAULT_ENABLE_CACHING,
    allowFollowUpCompletions = DEFAULT_ALLOW_FOLLOW_UP_COMPLETIONS,
    onError,
    requestHandler,
  } = options;

  if (enableCaching && !isCompletionAccepted) {
    const cachedCompletions = completionCache.get(pos, mdl).map((cache) => ({
      text: cache.completion,
      range: cache.range,
    }));

    if (cachedCompletions.length > 0) {
      return createInlineCompletionResult(cachedCompletions);
    }
  }

  if (
    token.isCancellationRequested ||
    (!allowFollowUpCompletions && isCompletionAccepted)
  ) {
    return createInlineCompletionResult([]);
  }

  try {
    const requestCompletion = asyncDebounce(
      async (params: FetchCompletionItemParams) => {
        options.onCompletionRequested?.(params);

        let response: FetchCompletionItemReturn;

        if (requestHandler) {
          response = await requestHandler(params);
        } else {
          response = await window.mira.requestCompletion(params);

          if (!response) {
            throw new Error(
              "Empty response from Electron IPC completion request"
            );
          }
          if ((response as any).error) {
            throw new Error((response as any).error);
          }
        }

        options.onCompletionRequestFinished?.(params, response);
        return response;
      },
      {
        [TriggerEnum.OnTyping]: DEFAULT_ON_TYPING_DEBOUNCE,
        [TriggerEnum.OnIdle]: DEFAULT_ON_IDLE_DEBOUNCE,
        [TriggerEnum.OnDemand]: DEFAULT_ON_DEMAND_DEBOUNCE,
      }[trigger]
    );

    token.onCancellationRequested(() => {
      requestCompletion.cancel();
    });

    const completionMetadata: CompletionMetadata = buildCompletionMetadata({
      pos,
      mdl,
      options,
    });

    const { completion } = await requestCompletion({
      body: {
        completionMetadata,
      },
    });

    if (completion) {
      const formattedCompletion = new CompletionFormatter(completion)
        .removeMarkdownCodeSyntax()
        .removeExcessiveNewlines()
        .removeInvalidLineBreaks()
        .build();

      const completionRange = new CompletionRange(monaco);

      if (enableCaching) {
        completionCache.add({
          completion: formattedCompletion,
          range: completionRange.computeCacheRange(pos, formattedCompletion),
          textBeforeCursor: getTextBeforeCursor(pos, mdl),
        });
      }

      return createInlineCompletionResult([
        {
          text: formattedCompletion,
          range: completionRange.computeInsertionRange(
            pos,
            formattedCompletion,
            mdl
          ),
        },
      ]);
    }
  } catch (error) {
    if (isCancellationError(error)) {
      return createInlineCompletionResult([]);
    } else if (onError) {
      onError(error as Error);
    } else {
      logger.warn("Cannot provide completion", error);
    }
  }

  return createInlineCompletionResult([]);
};
