import { monaco } from "../services/editor/editor.helper";
import { terminal } from "../services/terminal/terminal.service";

export function focus_terminal() {
  (document.activeElement as HTMLElement | null)?.blur();

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      terminal.focus();
    });
  });
}

export function focus_editor(editor?: monaco.editor.IStandaloneCodeEditor) {
  const target =
    editor ??
    monaco.editor.getEditors().find((e) => {
      const node = e.getDomNode();
      return node && node.offsetWidth > 0 && node.offsetHeight > 0;
    });

  if (!target) return;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      target.focus();
    });
  });
}
