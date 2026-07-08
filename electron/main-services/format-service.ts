import path from "node:path";
import * as prettier from "prettier";

export type FormatOptions = {
  tab_size?: number;
  insert_spaces?: boolean;
};

/**
 * Format `text` with Prettier, using `file_path` only to infer the parser and
 * to resolve the nearest `.prettierrc` / `.editorconfig` (the on-disk file may
 * be staler than the editor buffer we are handed). Returns the formatted text,
 * or `null` when the file is ignored, the language is unsupported, or Prettier
 * throws (e.g. a syntax error) — in every such case the caller leaves the
 * buffer untouched.
 */
export async function format_document(
  file_path: string,
  text: string,
  options: FormatOptions = {},
): Promise<string | null> {
  try {
    const info = await prettier.getFileInfo(file_path, {
      resolveConfig: true,
    });

    if (info.ignored) return null;

    const config = await prettier.resolveConfig(file_path, {
      editorconfig: true,
    });

    const parser = info.inferredParser ?? config?.parser;
    if (!parser) return null;

    const formatted = await prettier.format(text, {
      ...config,
      parser,
      filepath: file_path,
      tabWidth: config?.tabWidth ?? options.tab_size ?? 2,
      useTabs: config?.useTabs ?? options.insert_spaces === false,
    });

    return formatted;
  } catch (err) {
    console.error(`[format] failed to format ${path.basename(file_path)}`, err);
    return null;
  }
}
