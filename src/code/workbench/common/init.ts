import { Editor } from "../../editor/standalone/standalone.js";
import { setPanelVisibilty } from "../event/panel.js";
import { changePanelOptionsWidth } from "../event/panelOptions.js";
import { _xtermManager } from "./devPanel/spawnXterm.js";
import { getStandalone } from "./standalone.js";
import { watch } from "./store/selector.js";

const resizeObserver = new ResizeObserver((entries) => {
  entries.forEach(() => {
    changePanelOptionsWidth();
    _xtermManager._update();
  });
});

resizeObserver.observe(document.body);

watch(
  (s) => s.main.panel_state,
  (next) => {
    const _leftEl = document.querySelector(".left-panel") as HTMLDivElement;
    const _rightEl = document.querySelector(".right-panel") as HTMLDivElement;
    const _bottomEl = document.querySelector(".bottom-panel") as HTMLDivElement;
    setPanelVisibilty(_leftEl, next.left);
    setPanelVisibilty(_rightEl, next.right);
    setPanelVisibilty(_bottomEl, next.bottom);
  }
);

setTimeout(() => {
  const _editor = getStandalone("editor") as Editor;
  if (_editor) _editor._mount();
  changePanelOptionsWidth();
}, 100);
