import { dispatch } from "./store/store.js";
import { select } from "./store/selector.js";
import { update_panel_state } from "./store/slice.js";
import { getStandalone } from "./class.js";
import { Editor } from "../../editor/editors/editor.js";
import { getThemeIcon } from "../browser/media/icons.js";

const ipcRenderer = window.ipc;

export function addInformation(title: string) {
  const titlebar = document.querySelector(".titlebar.top") as HTMLDivElement;
  const informationSection = titlebar.querySelector(
    ".information-section",
  ) as HTMLDivElement;

  const el = document.createElement("div");
  el.className = "section";

  const loadingIcon = document.createElement("span");
  loadingIcon.className = "loading";
  loadingIcon.appendChild(getThemeIcon("loader"));

  const titleEl = document.createElement("span");
  titleEl.className = "title";
  titleEl.textContent = title;

  const logContainer = document.createElement("div");
  logContainer.className = "log-container scrollbar-container x-disable";

  el.appendChild(loadingIcon);
  el.appendChild(titleEl);
  el.appendChild(logContainer);

  titleEl.onclick = () => {
    if (logContainer.style.visibility === "hidden")
      logContainer.style.visibility = "visible";
    else logContainer.style.visibility = "hidden";
  };

  informationSection.appendChild(el);

  return el;
}

export function removeInformation(el: HTMLDivElement) {
  el.remove();
}

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
  } else if (_action === "workbench.zoom") {
    ipcRenderer.invoke("workbench.zoom");
  } else if (_action === "workbench.zoomout") {
    ipcRenderer.invoke("workbench.zoomout");
  } else if (_action === "workbench.reload") {
    ipcRenderer.invoke("workbench.reload");
  }
});
