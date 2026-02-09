import { getThemeIcon } from "../../../workbench/browser/media/icons.js";
import { Message } from "./message.js";

export class Loading extends Message {
  constructor(
    private title: string,
    private message: string,
  ) {
    super();
    this._createEl();
  }

  private _createEl() {
    this._el = document.createElement("div");
    this._el.className = "message-box";

    const titlebar = document.createElement("div");
    titlebar.className = "titlebar";

    const title = document.createElement("span");
    title.className = "title";
    title.textContent = this.title;

    const close = document.createElement("span");
    close.className = "close-icon";
    close.appendChild(getThemeIcon("close"));

    titlebar.appendChild(title);
    titlebar.appendChild(close);

    const content = document.createElement("div");
    content.className = "content";

    const description = document.createElement("span");
    description.className = "description";
    description.textContent = this.message;

    content.appendChild(description);

    this._el.appendChild(titlebar);
    this._el.appendChild(content);
  }

  _show() {
    if (!this._el) return;
    const _codeEl = document.querySelector(".code") as HTMLDivElement;

    _codeEl.style.opacity = "0.5";
    _codeEl.style.pointerEvents = "none";

    this._el.setAttribute("tabindex", "-1");
    this._el.focus();
  }

  _hide() {
    const _codeEl = document.querySelector(".code") as HTMLDivElement;

    _codeEl.style.opacity = "1";
    _codeEl.style.pointerEvents = "auto";
  }
}
