import { diff_editor } from "../../../../editor/editors/editor.monaco.diff";

let _diff: diff_editor | null = null;

export function diff_view(): diff_editor {
  if (!_diff) _diff = new diff_editor();
  return _diff;
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
