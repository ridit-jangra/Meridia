import "../../editor/editors/imageViewer.js";
import "../../editor/editors/fontViewer.js";
import { getStandalone, registerStandalone } from "../common/class.js";
import { Editor as EditorLayout } from "../../editor/browser/layout.js";
import { Files } from "./files.js";
import { Panel } from "./parts/panel/panel.js";
import { PanelOptions } from "./parts/panel/panelOptions.js";
import { PanelOption } from "./parts/panel/panelOption.js";
import { DevPanel } from "./parts/devPanel/el.js";
import { Mira } from "./parts/mira/browser/layout.js";
import { _xtermManager } from "../common/devPanel/spawnXterm.js";
import { Structure } from "./structure.js";
import { Editor } from "../../editor/editors/editor.js";
import { Titlebar } from "./parts/titlebar/titlebar.js";
import { Splitter } from "./parts/splitter/splitter.js";
import { Statusbar } from "./parts/statusbar/statusbar.js";
import { changePanelOptionsWidth } from "../common/panel-options.js";
import { _drawboard } from "../workbench.desktop.js";
import { _commandPanel } from "./parts/titlebar/commandPanel.js";
import { Preview } from "../../editor/common/preview.js";
import { ImageViewer } from "../../editor/editors/imageViewer.js";
import { FontViewer } from "../../editor/editors/fontViewer.js";
import { getThemeIcon } from "./media/icons.js";
import { _newProject } from "./window/new-project/browser/new-project.js";

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

    const explorerOption = new PanelOption(
      "Explorer",
      files,
      () => {},
      getThemeIcon("explorer")
    );
    const extensionOption = new PanelOption(
      "Extensions",
      mira,
      () => {},
      getThemeIcon("extension")
    );

    const leftPanelContent = new Panel("left-panel-content").getDomElement()!;
    const leftPanelOptions = new PanelOptions(
      [explorerOption, extensionOption],
      leftPanelContent,
      "left-panel-options",
      "left-panel-options"
    ).getDomElement()!;

    const middlePanel = new Panel("split-panel").getDomElement()!;

    const rightPanel = document.createElement("div");
    rightPanel.className = "right-panel";

    const rightPanelContent = new Panel("right-panel-content").getDomElement()!;

    leftPanel.appendChild(leftPanelContent);
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
      [leftPanel, middlePanel],
      "horizontal",
      [30, 70],
      () => {
        changePanelOptionsWidth();
        _xtermManager._update();
        _drawboard._updateCanvasSize();
      },
      "layout-splitter",
      "layout-splitter"
    );

    registerStandalone("panel-splitter-horizontal", splitterHorizontal);

    const activityBarLeft = document.createElement("div");
    activityBarLeft.className = "activity-bar left";

    const splitterContainerEl = document.createElement("div");
    splitterContainerEl.className = "splitter-container";

    splitterContainerEl.appendChild(splitterHorizontal.getDomElement()!);

    splitterContainerEl.insertBefore(
      activityBarLeft,
      splitterContainerEl.firstChild
    );

    activityBarLeft.appendChild(leftPanelOptions);

    codeEl.appendChild(titlebar);
    codeEl.appendChild(splitterContainerEl);
    codeEl.appendChild(statusbar);

    document.body.appendChild(codeEl);

    codeEl.appendChild(_commandPanel.getDomElement()!);

    setTimeout(() => {
      changePanelOptionsWidth();

      const _editor = getStandalone("editor") as Editor;
      if (_editor) {
        _editor._mount();
      }
      const _preview = getStandalone("preview") as Preview;
      if (_preview) {
        _preview._mount();
      }

      const _imageViewer = getStandalone("image-viewer") as ImageViewer;
      if (_imageViewer) {
        _imageViewer._mount();
      }

      const _fontViewer = getStandalone("font-viewer") as FontViewer;
      if (_fontViewer) {
        _fontViewer._mount();
      }

      _drawboard._updateCanvasSize();
      _xtermManager._update();

      _editorLayout.rerender();
    }, 300);
  }
}
