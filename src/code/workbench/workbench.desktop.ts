import "./browser/web.js";
import "./common/theme.js";
import "./common/scrollbar.js";
import "./common/state.js";
import "./common/extensionListener.js";
import "./common/tabs.js";
import "./common/titlebar.js";
import "./common/resources.js";
import "./common/class.js";
import "./common/command.js";
import "./common/editor.js";
import "./common/statusbar.js";
import "./browser/parts/mira/mira.js";
import "../platform/extension/extension.js";
import "../editor/standalone/standalone.js";
import { changePanelOptionsWidth } from "./common/panelOptions.js";
import { _xtermManager } from "./common/devPanel/spawnXterm.js";
import { watch } from "./common/store/selector.js";
import { setPanelVisibilty } from "./common/panel.js";
import { Drawboard } from "./browser/drawboard.js";
import { _addContent } from "./common/tabs.js";

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
