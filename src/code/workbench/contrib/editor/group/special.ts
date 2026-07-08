import { diff_editor } from "../../../../editor/editors/editor.monaco.diff";
import { open_editor_tab } from "../../../../editor/editor.helper";

let _diff: diff_editor | null = null;

export function diff_view(): diff_editor {
  if (!_diff) _diff = new diff_editor();
  return _diff;
}

const pending_ai_diffs = new Map<string, { prev: string; next: string }>();

export function get_pending_ai_diff(path: string) {
  return pending_ai_diffs.get(path);
}

export function open_ai_diff(path: string, prev: string, next: string): void {
  pending_ai_diffs.set(path, { prev, next });
  open_editor_tab(path, "EDITOR_DIFF");
}

export function clear_ai_diff(path: string): void {
  pending_ai_diffs.delete(path);
  _diff?.clear_ai(path);
}

export function close_ai_diff(path: string): void {
  const had = pending_ai_diffs.has(path);
  clear_ai_diff(path);
  if (had) open_editor_tab(path, "EDITOR_SINGLE");
}

export const IMAGE_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  bmp: "image/bmp",
  avif: "image/avif",
};
