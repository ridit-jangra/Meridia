import { registerStandalone } from "../../../../common/class.js";
import { getThemeIcon } from "../../../media/icons.js";
import { CoreEl } from "../../../parts/core.js";
import { Splitter } from "../../../parts/splitter/splitter.js";
import { SidebarTree } from "./sidebar-tree.js";
import { contentMap } from "../common/content-map.js";

export class NewProject extends CoreEl {
  private _contentEl!: HTMLDivElement;

  constructor() {
    super();
    this._createEl();
  }

  private _createEl() {
    this._el = document.createElement("div");
    this._el.className = "new-project";
    this._el.style.display = "none";

    const titlebar = document.createElement("div");
    titlebar.className = "titlebar";

    const title = document.createElement("span");
    title.textContent = "New Project";
    title.className = "title";

    const closeIcon = document.createElement("span");
    closeIcon.appendChild(getThemeIcon("close"));
    closeIcon.className = "close-icon";
    closeIcon.onclick = () => {
      this._hide();
    };

    titlebar.appendChild(title);
    titlebar.appendChild(closeIcon);

    const sidebar = document.createElement("div");
    sidebar.className = "sidebar";

    this._contentEl = document.createElement("div");
    this._contentEl.className = "content";

    const tree = new SidebarTree((key: string) =>
      this._setContent(key),
    ).getDomElement()!;

    sidebar.appendChild(tree);

    const splitterHorizontal = new Splitter(
      [sidebar, this._contentEl],
      "horizontal",
      [30, 70],
    );

    this._el.appendChild(titlebar);
    this._el.appendChild(splitterHorizontal.getDomElement()!);

    this._setContent("python-empty");

    document.body.appendChild(this._el);
  }

  private _setContent(key: string) {
    this._contentEl.innerHTML = "";

    const content = contentMap[key];
    if (!content) return;

    this._contentEl.appendChild(content);
  }

  _show() {
    if (!this._el) return;
    const _codeEl = document.querySelector(".code") as HTMLDivElement;

    this._el.style.display = "flex";

    _codeEl.style.opacity = "0.5";
    _codeEl.style.pointerEvents = "none";

    this._el.setAttribute("tabindex", "-1");
    this._el.focus();
  }

  _hide() {
    if (!this._el) return;
    const _codeEl = document.querySelector(".code") as HTMLDivElement;

    this._el.style.display = "none";

    _codeEl.style.opacity = "1";
    _codeEl.style.pointerEvents = "auto";
  }
}

export const _newProject = new NewProject();
registerStandalone("new-project", _newProject);
