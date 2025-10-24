import {
  DEFAULT_MIRA_MAX_TOKENS,
  DEFAULT_MIRA_STOP_SEQUENCE,
  DEFAULT_MIRA_STREAM,
  DEFAULT_MIRA_TEMPERATURE,
  DEFAULT_MIRA_TOP_P,
} from "../../defaults.js";
import type { PromptData } from "../../../types/mira.js";
import type {
  PickCompletion,
  PickCompletionCreateParams,
  PickModel,
} from "../../../types/llm.js";
import type { BaseMiraMetadata } from "../../../types/metadata.js";
import { MODEL_IDS, PROVIDER_ENDPOINT_MAP } from "../base.js";
import { BaseProviderHandler } from "../handler.js";

export class MistralHandler extends BaseProviderHandler<"mistral"> {
  createEndpoint(): string {
    return PROVIDER_ENDPOINT_MAP.mistral;
  }

  createRequestBody(
    model: PickModel<"mistral">,
    prompt: PromptData,
    metadata: BaseMiraMetadata
  ): PickCompletionCreateParams<"mistral"> {
    return {
      model: MODEL_IDS[model],
      prompt: `${prompt.context}\n${prompt.instruction}\n${metadata.textBeforeCursor}`,
      suffix: metadata.textAfterCursor,
      stream: DEFAULT_MIRA_STREAM,
      top_p: DEFAULT_MIRA_TOP_P,
      temperature: DEFAULT_MIRA_TEMPERATURE,
      stop: DEFAULT_MIRA_STOP_SEQUENCE,
      max_tokens: DEFAULT_MIRA_MAX_TOKENS,
    };
  }

  createHeaders(apiKey: string): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };
  }

  parseCompletion(completion: PickCompletion<"mistral">): string | null {
    const content = completion.choices?.[0]?.message.content;
    if (!content) return null;
    return Array.isArray(content)
      ? content
          .filter((chunk) => "text" in chunk)
          .map((chunk) => (chunk as { text: string }).text)
          .join("")
      : content;
  }
}
