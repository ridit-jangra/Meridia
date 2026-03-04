import * as monaco from "monaco-editor";

export const path = {
  sep: navigator.userAgent.includes("Windows") ? "\\" : "/",
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
  return uri.toLowerCase();
}

export function model_uri(model: monaco.editor.ITextModel): string {
  const raw = model.uri.fsPath || decodeURIComponent(model.uri.path);
  return path_to_uri(raw);
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

export function to_monaco_range(range: any): monaco.IRange {
  return {
    startLineNumber: range.start.line + 1,
    startColumn: range.start.character + 1,
    endLineNumber: range.end.line + 1,
    endColumn: range.end.character + 1,
  };
}

import { DiagnosticSeverity } from "vscode-languageserver-protocol";

export function lsp_severity_to_monaco(
  severity: DiagnosticSeverity | undefined,
): monaco.MarkerSeverity {
  switch (severity) {
    case DiagnosticSeverity.Error:
      return monaco.MarkerSeverity.Error;
    case DiagnosticSeverity.Warning:
      return monaco.MarkerSeverity.Warning;
    case DiagnosticSeverity.Information:
      return monaco.MarkerSeverity.Info;
    case DiagnosticSeverity.Hint:
      return monaco.MarkerSeverity.Hint;
    default:
      return monaco.MarkerSeverity.Error;
  }
}

export function lsp_completion_to_monaco(
  item: any,
  model: monaco.editor.ITextModel,
  position: monaco.Position,
): monaco.languages.CompletionItem {
  const word = model.getWordUntilPosition(position);
  const defaultRange = {
    startLineNumber: position.lineNumber,
    startColumn: word.startColumn,
    endLineNumber: position.lineNumber,
    endColumn: position.column,
  };
  return {
    label: item.label,
    kind: ((item.kind ?? 1) - 1) as monaco.languages.CompletionItemKind,
    detail: item.detail,
    documentation: item.documentation
      ? {
          value:
            typeof item.documentation === "string"
              ? item.documentation
              : (item.documentation.value ?? ""),
        }
      : undefined,
    insertText:
      item.insertText ??
      (typeof item.label === "string" ? item.label : item.label.label),
    insertTextRules:
      item.insertTextFormat === 2
        ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
        : undefined,
    range: item.textEdit?.range
      ? to_monaco_range(item.textEdit.range)
      : defaultRange,
    sortText: item.sortText,
    filterText: item.filterText,
    preselect: item.preselect,
    tags: item.deprecated ? [1] : undefined,
  };
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
  sym: any,
): { line: number; character: number } {
  const selStart = (sym.selectionRange ?? sym.range ?? sym.location?.range)
    ?.start;
  if (!selStart) return { line: 0, character: 0 };

  if (selStart.character > 0) return selStart;

  const lineText = model.getLineContent(selStart.line + 1) ?? "";
  const nameIdx = lineText.indexOf(sym.name);
  if (nameIdx >= 0) return { line: selStart.line, character: nameIdx };

  return selStart;
}

export function apply_lsp_edits(
  model: monaco.editor.ITextModel,
  edits: Array<{ range: any; newText: string }>,
): void {
  if (!edits?.length) return;

  const ops: monaco.editor.IIdentifiedSingleEditOperation[] = edits.map(
    (e) => ({
      range: to_monaco_range(e.range),
      text: e.newText,
      forceMoveMarkers: true,
    }),
  );

  model.pushEditOperations([], ops, () => null);
}
