import { explorer } from "../platform/explorer/explorer.service";
import { monaco, open_editor_tab, path_to_language } from "./editor.helper";

import { StandaloneServices } from "monaco-editor/esm/vs/editor/standalone/browser/standaloneServices";
import { ITextModelService } from "monaco-editor/esm/vs/editor/common/services/resolverService";

monaco.languages.typescript.typescriptDefaults.setEagerModelSync(false);
monaco.languages.typescript.typescriptDefaults.setMaximumWorkerIdleTime(-1);
monaco.languages.typescript.javascriptDefaults.setMaximumWorkerIdleTime(-1);
monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: true,
  noSyntaxValidation: true,
  noSuggestionDiagnostics: true,
});
monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: true,
  noSyntaxValidation: true,
  noSuggestionDiagnostics: true,
});
monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
  noLib: true,
  allowNonTsExtensions: true,
  noSuggestionDiagnostics: true,
});
monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
  noLib: true,
  allowNonTsExtensions: true,
  noSuggestionDiagnostics: true,
});
(monaco.languages.typescript as any).typescriptDefaults._onDidChange.fire();
monaco.languages.registerCompletionItemProvider("typescript", {
  provideCompletionItems: () => ({ suggestions: [] }),
});

//

export function patch_peek_model_service(): void {
  try {
    const svc = StandaloneServices.get(ITextModelService) as any;

    if (!svc) {
      return;
    }

    if (svc.__meridia_patched) {
      return;
    }

    svc.__meridia_patched = true;
    const original = svc.createModelReference.bind(svc);

    svc.createModelReference = async (resource: monaco.Uri) => {
      if (!monaco.editor.getModel(resource)) {
        try {
          const fsPath =
            resource.fsPath ||
            decodeURIComponent(resource.path).replace(/^\//, "");

          const content = await window.files.read_file_text(fsPath);
          monaco.editor.createModel(
            content,
            path_to_language(fsPath),
            resource,
          );
        } catch (e) {}
      }
      return original(resource);
    };
  } catch (e) {}
}

async function get_or_create_model(
  path: string,
): Promise<monaco.editor.ITextModel> {
  const uri = monaco.Uri.file(path);
  let model = monaco.editor.getModel(uri);

  if (!model) {
    const content = await explorer.actions.read_file(path);
    model = monaco.editor.createModel(content, undefined, uri);
  }

  return model;
}

function resolve_file_uri(url: string, workspace_path: string): string {
  let path = url.replace(/^file:\/\/\/?/, "");

  path = path.replace(/\\/g, "/");
  workspace_path = workspace_path.replace(/\\/g, "/");

  if (
    path.startsWith("./") ||
    path.startsWith("../") ||
    !path.startsWith("/")
  ) {
    const base = workspace_path.replace(/\/+$/, "");
    const parts = base.split("/");
    const rel_parts = path.replace(/^\.\//, "").split("/");

    for (const part of rel_parts) {
      if (part === "..") parts.pop();
      else if (part !== ".") parts.push(part);
    }

    return parts.join("/");
  }

  return path;
}

monaco.editor.registerLinkOpener({
  open(resource) {
    const url = resource.toString();

    if (url.startsWith("file://")) {
      const tree = explorer.tree.structure;

      if (!tree) {
        open_editor_tab(url);
        return true;
      }

      const resolved = resolve_file_uri(url, tree.path);
      open_editor_tab(resolved);
      return true;
    }

    if (url.startsWith("http://") || url.startsWith("https://")) {
      window.shell.open_external(url);
      return true;
    }

    return false;
  },
});

monaco.editor.registerEditorOpener({
  openCodeEditor(_, resource, selectionOrPosition) {
    const url = resource.fsPath;

    open_editor_tab(url);

    if (selectionOrPosition) {
      setTimeout(() => {
        const editor = monaco.editor
          .getEditors()
          .find((e) => e.getModel()?.uri.fsPath === url);
        if (!editor) return;

        if ("lineNumber" in selectionOrPosition) {
          editor.setPosition(selectionOrPosition);
          editor.revealPositionInCenter(selectionOrPosition);
        } else {
          editor.setSelection(selectionOrPosition);
          editor.revealRangeInCenter(selectionOrPosition);
        }
      }, 100);
    }

    return true;
  },
});

monaco.editor.registerEditorOpener({
  async openCodeEditor(_, resource, selectionOrPosition) {
    const path = resource.fsPath;

    const model = await get_or_create_model(path);

    open_editor_tab(path);

    if (selectionOrPosition) {
      setTimeout(() => {
        const editor = monaco.editor
          .getEditors()
          .find((e) => e.getModel() === model);
        if (!editor) return;

        if ("lineNumber" in selectionOrPosition) {
          editor.setPosition(selectionOrPosition);
          editor.revealPositionInCenter(selectionOrPosition);
        } else {
          editor.setSelection(selectionOrPosition);
          editor.revealRangeInCenter(selectionOrPosition);
        }
      }, 50);
    }

    return true;
  },
});
