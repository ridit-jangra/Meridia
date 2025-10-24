import type { Awaitable } from "./internal.js";
import type { Provider, ProviderImplementationMap } from "./llm.js";

export interface PromptData {
  context: string;
  instruction: string;
  fileContent: string;
}

export type CustomPrompt<T> = (metadata: T) => Partial<PromptData>;

type CustomOptions = {
  provider?: undefined;
  model: CustomMiraModel;
};

export type CustomMiraModel = (
  prompt: PromptData
) => Awaitable<CustomModelResponse>;

type CustomModelResponse = {
  text: string | null;
};

export type AIRequestHandler = (params: {
  endpoint: string;
  body: Record<string, unknown>;
  headers: Record<string, string>;
}) => Promise<Record<string, unknown>>;

export type MiraOptions = ProviderOptions<"mistral"> | CustomOptions;

export type ProviderOptions<T extends Provider> = {
  provider: T;
  model: ProviderImplementationMap[T]["Model"];
};
