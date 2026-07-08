import type * as monaco from "monaco-editor";
import type { DiagnosticSeverity } from "vscode-languageserver-protocol";

export const path = {
  sep:
    typeof navigator !== "undefined" && navigator.userAgent.includes("Windows")
      ? "\\"
      : "/",
};

export function path_to_uri(fsPath: string): string {
  const normalized = fsPath.replace(/\\/g, "/");
  if (/^[a-zA-Z]:\//.test(normalized)) {
    return `file:///${normalized.charAt(0).toLowerCase()}${normalized.slice(1)}`;
  }
  return normalized.startsWith("/")
    ? `file://${normalized}`
    : `file:///${normalized}`;
}

export function uri_to_path(uri: string): string {
  return uri
    .replace(/^file:\/\/\/([a-zA-Z]:)/, "$1")
    .replace(/^file:\/\//, "")
    .replace(/\//g, path.sep);
}

export function normalize_uri(uri: string): string {
  const is_windows =
    typeof navigator !== "undefined" && navigator.userAgent.includes("Windows");
  return is_windows ? uri.toLowerCase() : uri;
}

export function model_uri(model: monaco.editor.ITextModel): string {
  const raw = model.uri.fsPath || decodeURIComponent(model.uri.path);
  return path_to_uri(raw);
}

export function canonical_uri(uri: string): string {
  let decoded = uri;
  try {
    decoded = decodeURIComponent(uri);
  } catch {
    /* malformed escape — fall back to the raw string */
  }
  return normalize_uri(decoded);
}

export function to_lsp_position(
  pos: monaco.Position,
  model: monaco.editor.ITextModel,
): { line: number; character: number } {
  const lineCount = model.getLineCount();
  const line = Math.max(0, Math.min(pos.lineNumber - 1, lineCount - 1));
  const lineContent = model.getLineContent(line + 1);
  const character = Math.max(0, Math.min(pos.column - 1, lineContent.length));
  return { line, character };
}

export function to_monaco_range(range: {
  start: { line: number; character: number };
  end: { line: number; character: number };
}): monaco.IRange {
  return {
    startLineNumber: range.start.line + 1,
    startColumn: range.start.character + 1,
    endLineNumber: range.end.line + 1,
    endColumn: range.end.character + 1,
  };
}

export function lsp_severity_to_monaco(
  severity: DiagnosticSeverity | undefined,
  monacoInstance: typeof monaco,
): monaco.MarkerSeverity {
  switch (severity) {
    case 1:
      return monacoInstance.MarkerSeverity.Error;
    case 2:
      return monacoInstance.MarkerSeverity.Warning;
    case 3:
      return monacoInstance.MarkerSeverity.Info;
    case 4:
      return monacoInstance.MarkerSeverity.Hint;
    default:
      return monacoInstance.MarkerSeverity.Error;
  }
}

export function lsp_completion_to_monaco(
  item: Record<string, unknown>,
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  monacoInstance: typeof monaco,
): monaco.languages.CompletionItem {
  const word = model.getWordUntilPosition(position);
  const defaultRange: monaco.IRange = {
    startLineNumber: position.lineNumber,
    startColumn: word.startColumn,
    endLineNumber: position.lineNumber,
    endColumn: position.column,
  };

  const textEdit = item.textEdit as
    | {
        range: {
          start: { line: number; character: number };
          end: { line: number; character: number };
        };
        newText: string;
      }
    | undefined;
  const label = item.label as string | { label: string };

  const additionalTextEdits = item.additionalTextEdits as
    | Array<{
        range: {
          start: { line: number; character: number };
          end: { line: number; character: number };
        };
        newText: string;
      }>
    | undefined;

  const command = item.command as
    | { id?: string; command?: string; title?: string; arguments?: unknown[] }
    | undefined;

  return {
    label: item.label as string,
    kind: (((item.kind as number) ?? 1) -
      1) as monaco.languages.CompletionItemKind,
    detail: item.detail as string | undefined,
    documentation: item.documentation
      ? {
          value:
            typeof item.documentation === "string"
              ? item.documentation
              : ((item.documentation as { value?: string }).value ?? ""),
        }
      : undefined,
    insertText:
      (item.insertText as string) ??
      (typeof label === "string" ? label : label.label),
    insertTextRules:
      item.insertTextFormat === 2
        ? monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet
        : undefined,
    range: textEdit?.range ? to_monaco_range(textEdit.range) : defaultRange,
    sortText: item.sortText as string | undefined,
    filterText: item.filterText as string | undefined,
    preselect: item.preselect as boolean | undefined,
    tags: item.deprecated ? [1] : undefined,
    additionalTextEdits: additionalTextEdits?.map((e) => ({
      range: to_monaco_range(e.range),
      text: e.newText,
    })),
    command: command
      ? {
          id: (command.command ?? command.id) as string,
          title: command.title ?? "",
          arguments: command.arguments as unknown[] | undefined,
        }
      : undefined,

    __lsp_item: item,
  } as monaco.languages.CompletionItem;
}

export function to_lsp_completion_context(
  context?: monaco.languages.CompletionContext,
): { triggerKind: number; triggerCharacter?: string } {
  return context?.triggerCharacter
    ? { triggerKind: 2, triggerCharacter: context.triggerCharacter }
    : { triggerKind: 1 };
}

export function get_name_position(
  model: monaco.editor.ITextModel,
  sym: Record<string, unknown>,
): { line: number; character: number } {
  const range =
    sym.selectionRange ??
    sym.range ??
    (sym.location as Record<string, unknown> | undefined)?.range;
  const selStart = (range as Record<string, unknown> | undefined)?.start as
    { line: number; character: number } | undefined;
  if (!selStart) return { line: 0, character: 0 };
  if (selStart.character > 0) return selStart;
  const lineText = model.getLineContent(selStart.line + 1) ?? "";
  const nameIdx = lineText.indexOf(sym.name as string);
  if (nameIdx >= 0) return { line: selStart.line, character: nameIdx };
  return selStart;
}

export function apply_lsp_edits(
  model: monaco.editor.ITextModel,
  edits: Array<{
    range: {
      start: { line: number; character: number };
      end: { line: number; character: number };
    };
    newText: string;
  }>,
): void {
  if (!edits?.length) return;
  model.pushEditOperations(
    [],
    edits.map((e) => ({
      range: to_monaco_range(e.range),
      text: e.newText,
      forceMoveMarkers: true,
    })),
    () => null,
  );
}
