import { DEFAULT_TRIGGER } from "./defaults.js";
import { processInlineCompletions } from "./processor.js";
import { getEditorState } from "./state.js";
import { type RegisterCompletionOptions, TriggerEnum } from "./types/core.js";
import type { Monaco, StandaloneCodeEditor } from "./types/monaco.js";
import { getCurrentValue } from "./common/utils/editor.js";

export const createInlineCompletionsProvider = (
  monaco: Monaco,
  editor: StandaloneCodeEditor,
  initialOptions: RegisterCompletionOptions
) => {
  const state = getEditorState(editor);
  if (!state) return null;

  return monaco.languages.registerInlineCompletionsProvider(
    initialOptions.language,
    {
      provideInlineCompletions: (mdl, pos, _, token) => {
        if (mdl !== editor.getModel()) {
          return { items: [] };
        }

        const options = state.options || initialOptions;

        if (
          (options.trigger === TriggerEnum.OnDemand &&
            !state.isExplicitlyTriggered) ||
          (options.triggerIf &&
            !options.triggerIf({
              text: getCurrentValue(editor),
              position: pos,
              triggerType: options.trigger ?? DEFAULT_TRIGGER,
            }))
        ) {
          return;
        }

        return processInlineCompletions({
          monaco,
          mdl,
          pos,
          token,
          isCompletionAccepted: state.isCompletionAccepted,
          options,
        });
      },
      handleItemDidShow: (completions, item) => {
        state.isExplicitlyTriggered = false;
        state.hasRejectedCurrentCompletion = false;

        if (state.isCompletionAccepted) return;

        state.isCompletionVisible = true;
        const options = state.options || initialOptions;

        const completionText = item.text;
        options.onCompletionShown?.(completionText, item.range);
      },
      freeInlineCompletions: () => {},
    }
  );
};
