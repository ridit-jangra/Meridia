import { getStandalone, registerStandalone } from "../common/standalone.js";
import { changePanelOptionsWidth } from "../event/panelOptions.js";
import { Editor as EditorLayout } from "../../editor/browser/layout.js";
import { Files } from "./files.js";
import { Panel } from "./parts/panel.js";
import { PanelOptions } from "./parts/panelOptions.js";
import { PanelOption } from "./parts/panelOption.js";
import { Splitter } from "./parts/splitter.js";
import { Statusbar } from "./parts/statusbar.js";
import { DevPanel } from "./parts/devPanel/el.js";
import { Titlebar } from "./parts/titlebar.js";
import { getThemeIcon } from "./media/icons.js";
import { Mira } from "../../platform/mira/workbench/browser/layout.js";
import { _xtermManager } from "../common/devPanel/spawnXterm.js";
import { runCommand } from "../common/command.js";
import { select } from "../common/store/selector.js";
import { Structure } from "./structure.js";
import { Editor } from "../../editor/standalone/standalone.js";
import { IEditorTab } from "../types.js";
import { openTab } from "../common/utils.js";
import { _drawboard } from "../common/init.js";

export class Layout {
  constructor() {
    this._createEl();
  }

  private _createEl() {
    const codeEl = document.createElement("div");
    codeEl.className = "code";

    const titlebar = new Titlebar().getDomElement()!;

    const files = new Files().getDomElement()!;
    const mira = new Mira().getDomElement()!;
    const structure = new Structure().getDomElement()!;

    const devPanel = new DevPanel();
    registerStandalone("dev-panel", devPanel);

    const leftPanel = document.createElement("div");
    leftPanel.className = "left-panel";

    const filesOption = new PanelOption("Files", files);
    const extensionOption = new PanelOption("Extensions", mira);

    const miraOption = new PanelOption("Mira", mira);
    const structureOption = new PanelOption("Structure", structure);

    const leftPanelContent = new Panel("left-panel-content").getDomElement()!;
    const leftPanelOptions = new PanelOptions(
      [filesOption, extensionOption],
      leftPanelContent,
      "left-panel-options",
      "left-panel-options"
    ).getDomElement()!;

    const middlePanel = new Panel("split-panel").getDomElement()!;

    const rightPanel = document.createElement("div");
    rightPanel.className = "right-panel";

    const rightPanelContent = new Panel("right-panel-content").getDomElement()!;
    const rightPanelOptions = new PanelOptions(
      [miraOption, structureOption],
      rightPanelContent,
      "right-panel-options",
      "right-panel-options"
    ).getDomElement()!;

    leftPanel.appendChild(leftPanelOptions);
    leftPanel.appendChild(leftPanelContent);

    rightPanel.appendChild(rightPanelOptions);
    rightPanel.appendChild(rightPanelContent);

    const _editorLayout = new EditorLayout();

    const topPanel = new Panel("top-panel").getDomElement()!;
    const bottomPanel = new Panel("bottom-panel").getDomElement()!;

    bottomPanel.appendChild(devPanel.getDomElement()!);

    topPanel.appendChild(_editorLayout.getDomElement()!);

    const statusbar = new Statusbar().getDomElement()!;

    const splitterVertical = new Splitter(
      [topPanel, bottomPanel],
      "vertical",
      [60, 40],
      () => {
        _xtermManager._update();
        _drawboard._updateCanvasSize();
      }
    );

    registerStandalone("panel-splitter-vertical", splitterVertical);

    middlePanel.appendChild(splitterVertical.getDomElement()!);

    const splitterHorizontal = new Splitter(
      [leftPanel, middlePanel, rightPanel],
      "horizontal",
      [20, 60, 20],
      () => {
        changePanelOptionsWidth();
        _xtermManager._update();
        _drawboard._updateCanvasSize();
      }
    );

    registerStandalone("panel-splitter-horizontal", splitterHorizontal);

    codeEl.appendChild(titlebar);
    codeEl.appendChild(splitterHorizontal.getDomElement()!);
    codeEl.appendChild(statusbar);

    document.body.appendChild(codeEl);

    setTimeout(() => {
      changePanelOptionsWidth();

      const _editor = getStandalone("editor") as Editor;
      if (_editor) {
        console.log(_editor);
        _editor._mount();
      }
      _editorLayout.rerender();

      const _tab: IEditorTab = {
        name: "Drawboard",
        icon: getThemeIcon("drawboard"),
        uri: "tab://drawboard",
        is_touched: false,
        active: true,
      };

      openTab(_tab);

      _drawboard._updateCanvasSize();
    }, 150);
  }
}
