import { Editor } from "../../editor/standalone/standalone.js";
import { getStandalone, registerStandalone } from "../common/standalone.js";

import { IEditorTab } from "../types.js";

export function mount() {
  const _data = { userId: Date.now() };
  const _event = new CustomEvent("editor.mount", {
    detail: _data,
  });
  document.dispatchEvent(_event);
}

export function open(tab: IEditorTab) {
  const _data = { message: tab, userId: Date.now() };
  const _event = new CustomEvent("editor.open.file", {
    detail: _data,
  });
  document.dispatchEvent(_event);
}

export class EditorEventListner {
  constructor() {
    this.startListening();
  }

  startListening() {
    document.addEventListener("editor.open.file", (_event) => {
      const _customEvent = _event as CustomEvent;
      const _tab = _customEvent.detail.message;
      const _editor = getStandalone("editor") as Editor;
      if (!_editor) return;

      _editor._open(_tab);
    });

    document.addEventListener("editor.mount", (_event) => {
      const _editor = getStandalone("editor") as Editor;
      if (!_editor) return;

      _editor._mount();
    });
  }
}

export const _editorEventListner = new EditorEventListner();
registerStandalone("editor-event-listner", _editorEventListner);
