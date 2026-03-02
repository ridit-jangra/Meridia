import { explorer } from "../platform/explorer/explorer.service";
import { monaco, open_editor_tab } from "./editor.helper";

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
