import type { CompletionRequestBody, RegisterCompletionOptions } from "./core";
import type {
  CursorPosition,
  EditorKeyboardEvent,
  EditorModel,
  Monaco,
} from "./monaco.js";

export type Awaitable<T> = T | Promise<T>;

export type MiraAIResponse = {
  text: string | null;
  raw?: unknown;
  error?: string;
};

export interface EditorCompletionState {
  isCompletionAccepted: boolean;
  isCompletionVisible: boolean;
  isExplicitlyTriggered: boolean;
  hasRejectedCurrentCompletion: boolean;
  options?: RegisterCompletionOptions | undefined;
}

export type FetchCompletionItemHandler = (
  params: FetchCompletionItemParams
) => Promise<FetchCompletionItemReturn>;

export type FetchCompletionItemReturn = {
  completion: string | null;
  error?: string | undefined;
};

export interface FetchCompletionItemParams {
  body: CompletionRequestBody;
}

export interface ConstructCompletionMetadataParams {
  mdl: EditorModel;
  pos: CursorPosition;
  options: RegisterCompletionOptions;
}

export interface CompletionKeyEventHandlerParams {
  monaco: Monaco;
  event: EditorKeyboardEvent;
  state: EditorCompletionState;
  options: RegisterCompletionOptions;
}
