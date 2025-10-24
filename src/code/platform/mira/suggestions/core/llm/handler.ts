import type { PromptData } from "../../types/mira.js";
import type {
  Model,
  PickCompletion,
  PickCompletionCreateParams,
  PickModel,
  Provider,
} from "../../types/llm.js";
import type { BaseMiraMetadata } from "../../types/metadata.js";

export abstract class BaseProviderHandler<P extends Provider> {
  abstract createEndpoint(model: Model, apiKey?: string): string;

  abstract createRequestBody(
    model: PickModel<P>,
    prompt: PromptData,
    metadata: BaseMiraMetadata
  ): PickCompletionCreateParams<P>;

  abstract createHeaders(apiKey: string): Record<string, string>;

  abstract parseCompletion(completion: PickCompletion<P>): string | null;
}
