import { registerStandalone } from "../common/workbench.standalone.js";
import { changePanelOptionsWidth } from "../event/workbench.event.panel.options.js";
import { Editor as EditorLayout } from "./workbench.layout.editor.js";
import { Files } from "./workbench.layout.files.js";
import { Panel } from "./workbench.parts/workbench.part.panel.js";
import { PanelOptions } from "./workbench.parts/workbench.part.panel.options.js";
import { PanelOption } from "./workbench.parts/workbench.part.panel.options.option.js";
import { Splitter } from "./workbench.parts/workbench.part.splitter.js";
import { Statusbar } from "./workbench.parts/workbench.part.status.js";
import { DevPanel } from "./workbench.parts/workbench.part.dev.panel/workbench.part.dev.panel.el.js";
import { Titlebar } from "./workbench.parts/workbench.part.titlebar.js";
import { runIcon, stopIcon } from "./workbench.media/workbench.icons.js";
import { Mira } from "../../platform/mira/mira.workbench/browser/workbench.mira.layout.js";
import { _xtermManager } from "../common/workbench.dev.panel/workbench.dev.panel.spawn.xterm.js";
import { runCommand } from "../common/workbench.command.js";
import { select } from "../common/workbench.store/workbench.store.selector.js";
import "../common/workbench.init.js";

export class Layout {
  constructor() {
    this.startup();
  }

  private startup() {
    const codeEl = document.createElement("div");
    codeEl.className = "code";

    const titlebar = new Titlebar().getDomElement()!;

    const files = new Files().getDomElement()!;

    const mira = new Mira().getDomElement()!;

    const devPanel = new DevPanel();
    registerStandalone("dev-panel", devPanel);

    const commandPanel = new Panel("command-panel").getDomElement()!;

    const leftPanel = new Panel("left-panel").getDomElement()!;
    const middlePanel = new Panel("split-panel").getDomElement()!;
    const rightPanel = new Panel("right-panel").getDomElement()!;

    const filesOption = new PanelOption("Files").getDomElement()!;
    filesOption.className = "active";

    const extensionOption = new PanelOption("Extensions").getDomElement()!;

    const leftPanelOptions = new PanelOptions(
      [filesOption, extensionOption],
      leftPanel,
      "left-panel-options"
    );

    filesOption.onclick = () => {
      leftPanelOptions._updateContent(files);
    };

    leftPanelOptions._updateContent(files);

    const miraOption = new PanelOption("Mira").getDomElement()!;
    miraOption.className = "active";

    const structureOption = new PanelOption("Structure").getDomElement()!;

    const runOption = new PanelOption(
      null as any,
      () => {},
      runIcon
    ).getDomElement()!;

    runOption.onclick = () => {
      const _tabs = select((s) => s.main.editor_tabs);
      const _active = _tabs.find((t) => t.active);

      if (_active) runCommand("workbench.editor.run", [_active.uri]);
    };

    const stopOption = new PanelOption(
      null as any,
      () => {},
      stopIcon
    ).getDomElement()!;

    stopOption.onclick = () => {
      const _tabs = select((s) => s.main.editor_tabs);
      const _active = _tabs.find((t) => t.active);

      if (_active) runCommand("workbench.editor.stop", [_active.uri]);
    };

    document.addEventListener("workbench.editor.run.disable", () => {
      runOption.classList.add("disabled");
      runOption.style.pointerEvents = "none";
      runOption.style.opacity = "0.5";
    });
    document.addEventListener("workbench.editor.run.enable", () => {
      runOption.classList.remove("disabled");
      runOption.style.pointerEvents = "auto";
      runOption.style.opacity = "1";
    });
    document.addEventListener("workbench.editor.stop.disable", () => {
      stopOption.classList.add("disabled");
      stopOption.style.pointerEvents = "none";
      stopOption.style.opacity = "0.5";
    });
    document.addEventListener("workbench.editor.stop.enable", () => {
      stopOption.classList.remove("disabled");
      stopOption.style.pointerEvents = "auto";
      stopOption.style.opacity = "1";
    });

    stopOption.classList.add("disabled");
    stopOption.style.pointerEvents = "none";
    stopOption.style.opacity = "0.5";

    const middlePanelOptions = new PanelOptions(
      [runOption, stopOption],
      null as any,
      "middle-panel-options"
    );

    const rightPanelOptions = new PanelOptions(
      [miraOption, structureOption],
      rightPanel,
      "right-panel-options"
    );

    rightPanelOptions._updateContent(mira);

    commandPanel.appendChild(leftPanelOptions.getDomElement()!);
    commandPanel.appendChild(middlePanelOptions.getDomElement()!);
    commandPanel.appendChild(rightPanelOptions.getDomElement()!);

    const _editorLayout = new EditorLayout().getDomElement()!;

    const topPanel = new Panel("top-panel").getDomElement()!;
    const bottomPanel = new Panel("bottom-panel").getDomElement()!;

    bottomPanel.appendChild(devPanel.getDomElement()!);

    topPanel.appendChild(_editorLayout);

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
  }
}
