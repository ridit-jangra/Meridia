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

    const commandPanel = new Panel("command-panel").getDomElement()!;

    const leftPanel = new Panel("left-panel").getDomElement()!;
    const middlePanel = new Panel("split-panel").getDomElement()!;
    const rightPanel = new Panel("right-panel").getDomElement()!;

    const filesOption = new PanelOption("Files", files);

    const extensionOption = new PanelOption("Extensions", mira);

    const leftPanelOptions = new PanelOptions(
      [filesOption, extensionOption],
      leftPanel,
      "left-panel-options",
      "left-panel-options"
    );

    const miraOption = new PanelOption("Mira", mira);

    const structureOption = new PanelOption("Structure", structure);

    const runOption = new PanelOption(
      null as any,
      null as any,
      () => {
        const _tabs = select((s) => s.main.editor_tabs);
        const _active = _tabs.find((t) => t.active);

        if (_active) runCommand("workbench.editor.run", [_active.uri]);
      },
      getThemeIcon("run")
    );

    const stopOption = new PanelOption(
      null as any,
      null as any,
      () => {
        const _tabs = select((s) => s.main.editor_tabs);
        const _active = _tabs.find((t) => t.active);

        if (_active) runCommand("workbench.editor.stop", [_active.uri]);
      },
      getThemeIcon("stop")
    );

    document.addEventListener("workbench.editor.run.disable", () => {
      runOption.getDomElement()!.innerHTML = getThemeIcon("rerun");
      runOption.getDomElement()!.onclick = () => {
        const _tabs = select((s) => s.main.editor_tabs);
        const _active = _tabs.find((t) => t.active);

        if (_active) runCommand("workbench.editor.rerun", [_active.uri]);
      };
    });
    document.addEventListener("workbench.editor.run.enable", () => {
      runOption.getDomElement()!.innerHTML = getThemeIcon("run");
      runOption.getDomElement()!.onclick = () => {
        const _tabs = select((s) => s.main.editor_tabs);
        const _active = _tabs.find((t) => t.active);

        if (_active) runCommand("workbench.editor.run", [_active.uri]);
      };
    });
    document.addEventListener("workbench.editor.stop.disable", () => {
      stopOption.getDomElement()!.style.display = "none";
    });
    document.addEventListener("workbench.editor.stop.enable", () => {
      stopOption.getDomElement()!.style.display = "flex";
    });

    stopOption.getDomElement()!.style.display = "none";

    const middlePanelOptions = new PanelOptions(
      [runOption, stopOption],
      null as any,
      "middle-panel-options"
    );

    const rightPanelOptions = new PanelOptions(
      [miraOption, structureOption],
      rightPanel,
      "right-panel-options",
      "right-panel-options"
    );

    commandPanel.appendChild(leftPanelOptions.getDomElement()!);
    commandPanel.appendChild(middlePanelOptions.getDomElement()!);
    commandPanel.appendChild(rightPanelOptions.getDomElement()!);

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
      }
    );

    registerStandalone("panel-splitter-horizontal", splitterHorizontal);

    codeEl.appendChild(titlebar);
    codeEl.appendChild(commandPanel);
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
    }, 150);
  }
}
