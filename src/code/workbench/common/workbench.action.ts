import { dispatch } from "./workbench.store/workbench.store.js";
import { select } from "./workbench.store/workbench.store.selector.js";
import { update_panel_state } from "./workbench.store/workbench.store.slice.js";

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
  }
});
