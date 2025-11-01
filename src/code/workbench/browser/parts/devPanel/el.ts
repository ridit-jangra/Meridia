import { registerStandalone } from "../../../common/class.js";
import { CoreEl } from "../core.js";
import { Panel } from "../panel/panel.js";
import { DevPanelTabs } from "./tabs.js";

export class DevPanel extends CoreEl {
  constructor() {
    super();
    this._createEl();
  }

  private _createEl() {
    this._el = document.createElement("div");
    this._el.className = "dev-panel";

    const _content = new Panel("content").getDomElement()!;
    _content.className =
      "panel content scrollbar-container x-disable y-disable";

    const _tabs = new DevPanelTabs(_content);
    registerStandalone("workbench.workspace.dev.tab", _tabs);

    this._el.classList.add("collapsed");
    this._el.appendChild(_content);
    this._el.appendChild(_tabs.getDomElement()!);
  }
}
