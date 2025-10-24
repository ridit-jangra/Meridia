import type {
  FIMCompletionResponse as MistralFIMCompletion,
  FIMCompletionRequest$Outbound as MistralFIMCompletionCreateParams,
} from "@mistralai/mistralai/models/components";

import type { PromptData } from "./mira.js";

export type Provider = "mistral";

export interface ProviderImplementationMap {
  mistral: {
    Model: "codestral";
    Params: MistralFIMCompletionCreateParams;
    Completion: MistralFIMCompletion;
  };
}

export type MistralModel = ProviderImplementationMap["mistral"]["Model"];

export type Model = {
  [K in Provider]: ProviderImplementationMap[K]["Model"];
}[Provider];

export type PickModel<P extends Provider> =
  ProviderImplementationMap[P]["Model"];
export type PickCompletionCreateParams<P extends Provider> =
  ProviderImplementationMap[P]["Params"];
export type PickCompletion<P extends Provider> =
  ProviderImplementationMap[P]["Completion"];

export type CompletionCreateParams = {
  [K in Provider]: ProviderImplementationMap[K]["Params"];
}[Provider];
export type Completion = {
  [K in Provider]: ProviderImplementationMap[K]["Completion"];
}[Provider];

export type MistralCompletionCreateParams = MistralFIMCompletionCreateParams;
export type MistralCompletion = MistralFIMCompletion;

export interface ProviderHandler<P extends Provider> {
  createEndpoint(model: PickModel<P>, apiKey: string): string;
  createRequestBody(
    model: PickModel<P>,
    prompt: PromptData
  ): PickCompletionCreateParams<P>;
  createHeaders(apiKey: string): Record<string, string>;
  parseCompletion(completion: PickCompletion<P>): string | null;
}
