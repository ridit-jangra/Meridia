import { registerStandalone } from "../../../common/class.js";
import { _xtermManager } from "../../../common/devPanel/spawnXterm.js";
import { CoreEl } from "../core.js";
import { Panel } from "../panel/panel.js";
import { Splitter } from "../splitter/splitter.js";
import { DevPanelTabs } from "./tabs.js";

export class DevPanel extends CoreEl {
  constructor() {
    super();
    this._createEl();
  }

  private _createEl() {
    this._el = document.createElement("div");
    this._el.className = "dev-panel";

    const _content = document.createElement("div");
    _content.className = "content";

    const _tabContent = new Panel("tab-content").getDomElement()!;
    _tabContent.className =
      "panel content scrollbar-container x-disable y-disable";

    const _tabs = new DevPanelTabs(_tabContent);
    registerStandalone("workbench.workspace.dev.tab", _tabs);

    const _contentTabs = document.createElement("div");
    _contentTabs.className =
      "content-tabs tabs vertical scrollbar-container x-disable";

    _content.appendChild(_tabs.getDomElement()!);
    _content.appendChild(_tabContent);

    const _splitter = new Splitter(
      [_content, _contentTabs],
      "horizontal",
      [70, 30],
      () => {
        _xtermManager._update();
      },
      "workbench.workspace.dev.panel.splitter"
    );

    this._el.appendChild(_splitter.getDomElement()!);
  }
}
