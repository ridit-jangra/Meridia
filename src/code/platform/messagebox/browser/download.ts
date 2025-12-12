import { getThemeIcon } from "../../../workbench/browser/media/icons.js";
import { Message } from "./message.js";

export class Download extends Message {
  private logContainer!: HTMLDivElement;

  constructor(
    private title: string,
    private message: string,
    private command: string,
    private args?: string[]
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
    close.innerHTML = getThemeIcon("close");

    titlebar.appendChild(title);
    titlebar.appendChild(close);

    const content = document.createElement("div");
    content.className = "content";

    const buttonWrapper = document.createElement("div");
    buttonWrapper.className = "button-wrapper";

    const cancel = document.createElement("span");
    cancel.textContent = "Cancel";
    cancel.onclick = () => {
      this._hide();
      this._el!.remove();
    };

    const install = document.createElement("span");
    install.textContent = "Install";

    install.onclick = () => {
      this._start();
    };

    buttonWrapper.appendChild(cancel);
    buttonWrapper.appendChild(install);

    const description = document.createElement("span");
    description.className = "description";
    description.textContent = this.message;

    this.logContainer = document.createElement("div");
    this.logContainer.className = "log-container scrollbar-container";
    this.logContainer.style.display = "none";

    content.appendChild(description);
    content.appendChild(buttonWrapper);
    content.appendChild(this.logContainer);

    this._el.appendChild(titlebar);
    this._el.appendChild(content);
  }

  _start() {
    const buttonWrapper = this._el?.querySelector(
      ".button-wrapper"
    ) as HTMLDivElement;

    window.ipc.on(
      "workbench.workspace.install.log",
      (_: any, log: { type: string; message: string }) => {
        this._appendLog(log);
      }
    );

    window.ipc.on("workbench.workspace.install.complete", () => {
      buttonWrapper.style.display = "flex";
      (buttonWrapper.firstChild as HTMLSpanElement).style.display = "none";
      buttonWrapper.lastChild!.textContent = "Done";
      (buttonWrapper.lastChild as HTMLSpanElement)!.onclick = () => {
        this._hide();
        this._el!.remove();
      };
    });

    const description = this._el?.querySelector(
      ".description"
    ) as HTMLSpanElement;
    description.textContent = "Installing...";

    buttonWrapper.style.display = "none";

    this.logContainer.innerHTML = "";
    this.logContainer.style.display = "none";

    window.ipc.invoke("workbench.workspace.install", this.command, this.args);
  }

  private _appendLog(log: { type: string; message: string }) {
    if (!this.logContainer) return;

    const logEntry = document.createElement("div");
    logEntry.className = `log-entry log-${log.type}`;

    const timestamp = new Date().toLocaleTimeString();

    logEntry.innerHTML = `
      <span class="log-time">[${timestamp}]</span>
      <span class="log-message">${this._escapeHtml(log.message)}</span>
    `;

    this.logContainer.appendChild(logEntry);
    this.logContainer.scrollTop = this.logContainer.scrollHeight;

    if (this.logContainer.style.display === "none") {
      this.logContainer.style.display = "block";
    }
  }

  private _escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
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
