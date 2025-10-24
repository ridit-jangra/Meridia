import type { PromptData } from "../../types/mira.js";
import type {
  Completion,
  CompletionCreateParams,
  PickModel,
  Provider,
} from "../../types/llm.js";
import type { BaseMiraMetadata } from "../../types/metadata.js";
import type { BaseProviderHandler } from "./handler.js";
import { MistralHandler } from "./providers/mistral.js";

const providerHandlers: { [P in Provider]: BaseProviderHandler<P> } = {
  mistral: new MistralHandler(),
};

export const createProviderEndpoint = <P extends Provider>(
  model: PickModel<P>,
  apiKey: string,
  provider: P
): string => providerHandlers[provider].createEndpoint(model, apiKey);

export const createRequestBody = <P extends Provider>(
  model: PickModel<P>,
  provider: P,
  prompt: PromptData,
  metadata: BaseMiraMetadata
): CompletionCreateParams =>
  providerHandlers[provider].createRequestBody(model, prompt, metadata);

export const createProviderHeaders = <P extends Provider>(
  apiKey: string,
  provider: P
): Record<string, string> => providerHandlers[provider].createHeaders(apiKey);

export const parseProviderCompletion = <P extends Provider>(
  completion: Completion,
  provider: P
): string | null => providerHandlers[provider].parseCompletion(completion);
