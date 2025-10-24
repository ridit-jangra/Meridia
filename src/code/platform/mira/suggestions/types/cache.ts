import type { EditorRange } from "./monaco.js";

export interface CompletionCacheItem {
  completion: string;
  range: EditorRange;
  textBeforeCursor: string;
}
