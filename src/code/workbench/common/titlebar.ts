import { dispatch } from "./store/store.js";
import { select } from "./store/selector.js";
import { update_panel_state } from "./store/slice.js";
import { getStandalone } from "./class.js";
import { Editor } from "../../editor/standalone/standalone.js";

const ipcRenderer = window.ipc;

document.addEventListener("workbench.workspace.toggle.action", (_event) => {
  const _customEvent = _event as CustomEvent;
  const _action = _customEvent.detail.action;

  if (_action === "workbench.panel.toggle.left") {
    const _state = select((s) => s.main.panel_state);
    dispatch(update_panel_state({ ..._state, left: !_state.left }));
  } else if (_action === "workbench.panel.toggle.right") {
    const _state = select((s) => s.main.panel_state);
    dispatch(update_panel_state({ ..._state, right: !_state.right }));
  } else if (_action === "workbench.panel.toggle.bottom") {
    const _state = select((s) => s.main.panel_state);
    dispatch(update_panel_state({ ..._state, bottom: !_state.bottom }));
  } else if (_action === "workbench.files.open") {
    ipcRenderer.invoke("workbench.workspace.folder.open");
  } else if (_action === "workbench.editor.save") {
    const _editor = getStandalone("editor") as Editor;
    if (_editor && _editor._editor) {
      const _model = _editor._editor.getModel();
      _editor._save(_model?.uri.path!);
    }
  }
});
