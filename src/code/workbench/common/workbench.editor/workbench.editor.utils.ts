import * as monaco from "monaco-editor";
import { select } from "../workbench.store/workbench.store.selector";
import { languages } from "../../../platform/editor/editor.languages";

const path = window.path;

function getCurrentFileDirectory(): string {
  const activeFile = select((s) => s.main.editor_tabs).find((t) => t.active);
  if (activeFile && activeFile.uri) {
    return path.dirname(activeFile.uri);
  }

  return select((s) => s.main.folder_structure).uri;
}

function getCurrentFileName(): string | null {
  const activeFile = select((s) => s.main.editor_tabs).find((t) => t.active);
  if (activeFile && activeFile.uri) {
    return path.basename(activeFile.uri);
  }
  return null;
}

export function extractPathFromString(text: string, currentColumn: number) {
  const stringRegex = /(['"])(.*?)\1/g;
  const openStringRegex = /(['"])(.*?)$/;

  let match;

  while ((match = stringRegex.exec(text)) !== null) {
    const start = match.index + 1;
    const end = match.index + match[0].length - 1;

    if (currentColumn > start && currentColumn <= end) {
      const pathContent = match[2];
      if (looksLikePath(pathContent!)) {
        return extractPathComponents(pathContent!, start, currentColumn);
      }
    }
  }

  const openMatch = openStringRegex.exec(text);
  if (openMatch) {
    const start = openMatch.index + 1;
    if (currentColumn > start) {
      const pathContent = openMatch[2];
      if (looksLikePath(pathContent!)) {
        return extractPathComponents(pathContent!, start, currentColumn);
      }
    }
  }

  return null;
}

export function resolvePath(pathStr: string): string {
  const currentFileDirectory = getCurrentFileDirectory();

  if (pathStr.startsWith("./") || pathStr.startsWith(".\\")) {
    return path.join([currentFileDirectory, pathStr.substring(2)]);
  } else if (pathStr.startsWith("../") || pathStr.startsWith("..\\")) {
    return path.resolve([currentFileDirectory, pathStr]);
  } else if (pathStr.startsWith("/")) {
    return pathStr;
  } else if (/^[a-zA-Z]:/.test(pathStr)) {
    return pathStr;
  }

  return path.join([currentFileDirectory, pathStr]);
}

export function extractPathComponents(
  pathStr: string,
  stringStart: number,
  currentColumn: number
) {
  const currentFileDirectory = getCurrentFileDirectory();
  const relativeCursorPos = currentColumn - stringStart - 1;
  const beforeCursor = pathStr.substring(0, relativeCursorPos);
  const afterCursor = pathStr.substring(relativeCursorPos);

  const lastSepIndex = Math.max(
    beforeCursor.lastIndexOf("/"),
    beforeCursor.lastIndexOf("\\")
  );

  let basePath, partial, replaceStart, replaceEnd;

  if (lastSepIndex === -1) {
    basePath = currentFileDirectory;
    partial = beforeCursor;
    replaceStart = stringStart + 1;
  } else {
    const dirPath = beforeCursor.substring(0, lastSepIndex + 1);
    basePath = resolvePath(dirPath);
    partial = beforeCursor.substring(lastSepIndex + 1);
    replaceStart = stringStart + lastSepIndex + 2;
  }

  const nextSepIndex = Math.min(
    afterCursor.indexOf("/") !== -1 ? afterCursor.indexOf("/") : Infinity,
    afterCursor.indexOf("\\") !== -1 ? afterCursor.indexOf("\\") : Infinity
  );

  replaceEnd =
    nextSepIndex === Infinity ? currentColumn : currentColumn + nextSepIndex;

  return { basePath, partial, replaceStart, replaceEnd };
}

export function looksLikePath(str: string): boolean {
  if (!str || str.length < 2) return false;

  const trimmed = str.trim();

  return (
    trimmed.includes("/") ||
    trimmed.includes("\\") ||
    trimmed.startsWith("./") ||
    trimmed.startsWith("../") ||
    trimmed.startsWith(".\\") ||
    trimmed.startsWith("..\\") ||
    trimmed.startsWith("~") ||
    /^[a-zA-Z]:[\/\\]/.test(trimmed) ||
    trimmed.startsWith("\\\\") ||
    /^\/[^\/\s]/.test(trimmed) ||
    /\.[a-zA-Z0-9]{1,6}$/.test(trimmed)
  );
}

export async function getPathCompletions(basePath: string, partial: string) {
  try {
    const items = await window.editor.getFsSuggestions(basePath);
    const currentFileName = getCurrentFileName();
    const currentFileDirectory = getCurrentFileDirectory();

    let filteredItems = items;

    if (currentFileName && basePath === currentFileDirectory) {
      filteredItems = items.filter((item) => item.name !== currentFileName);
    }

    if (!partial) {
      return filteredItems;
    }

    const matchingItems = filteredItems.filter((item) => {
      const name = item.name.toLowerCase();
      const search = partial.toLowerCase();

      return name.startsWith(search) || name.includes(search);
    });

    return matchingItems.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const search = partial.toLowerCase();

      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;

      const aExact = aName === search ? 0 : 1;
      const bExact = bName === search ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;

      const aStarts = aName.startsWith(search) ? 0 : 1;
      const bStarts = bName.startsWith(search) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;

      return aName.localeCompare(bName);
    });
  } catch (error) {
    return [];
  }
}

export function extensionToLanguage(_ext: string) {
  const languageMap: Record<string, string> = {
    py: "python",
    js: "javascript",
    ts: "typescript",
    rs: "rust",
    sh: "bash",
  };

  return languageMap[_ext.toLowerCase()];
}

export function registerFsSuggestion(_monaco: any) {
  const _extensions = languages.keys();
  _extensions.forEach((_ext) => {
    const _language = extensionToLanguage(_ext);

    return _monaco.languages.registerCompletionItemProvider(_language, {
      triggerCharacters: ["/", "\\", "."],

      provideCompletionItems: async function (
        model: monaco.editor.ITextModel,
        position: monaco.Position
      ) {
        const textUntilPosition = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        const pathInfo = extractPathFromString(
          textUntilPosition,
          position.column
        );

        if (!pathInfo) {
          return { suggestions: [] };
        }

        try {
          const suggestions = await getPathCompletions(
            pathInfo.basePath,
            pathInfo.partial
          );

          return {
            suggestions: suggestions.map((item) => ({
              label: item.name,
              kind: item.isDirectory
                ? monaco.languages.CompletionItemKind.Folder
                : monaco.languages.CompletionItemKind.File,
              insertText: item.name + (item.isDirectory ? "/" : ""),
              detail: item.isDirectory ? "Directory" : "File",
              sortText: item.isDirectory ? "0" + item.name : "1" + item.name,

              command: item.isDirectory
                ? {
                    id: "editor.action.triggerSuggest",
                    title: "Trigger Suggest",
                  }
                : undefined,
              range: {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: pathInfo.replaceStart,
                endColumn: pathInfo.replaceEnd,
              },
            })),
          };
        } catch (error) {
          return { suggestions: [] };
        }
      },
    });
  });
}
