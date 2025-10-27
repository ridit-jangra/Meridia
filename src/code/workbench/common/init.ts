import { Drawboard } from "../browser/drawboard.js";
import { setPanelVisibilty } from "../event/panel.js";
import { changePanelOptionsWidth } from "../event/panelOptions.js";
import { _xtermManager } from "./devPanel/spawnXterm.js";

import { watch } from "./store/selector.js";
import { _addContent } from "./tabs.js";

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

export const _drawboard = new Drawboard();
_addContent("tab://drawboard", _drawboard.getDomElement()!);
