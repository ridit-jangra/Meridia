import { CoreEl } from "../core.js";

export class CommandPanel extends CoreEl {
  private _optionsEl: HTMLDivElement | null = null;
  private _input: HTMLInputElement | null = null;
  private _active: boolean = false;

  constructor() {
    super();
    this._createEl();
  }

  async _createEl() {
    this._el = document.createElement("div");
    this._el.className = "command-panel widget";

    const _searchEl = document.createElement("div");
    _searchEl.className = "search";

    this._input = document.createElement("input");
    this._input.type = "text";
    this._input.placeholder = "Search commands, files, operations, etc.";

    _searchEl.appendChild(this._input);

    this._optionsEl = document.createElement("div");
    this._optionsEl.className = "options scrollbar-container x-disable";

    this._el.appendChild(_searchEl);
    this._el.appendChild(this._optionsEl);

    setTimeout(() => {
      this._input!.focus();
    }, 200);
  }

  _show() {
    this._el!.style.display = "flex";
    this._active = true;
  }

  _hide() {
    this._el!.style.display = "none";
    this._active = false;
  }

  _toggle() {
    if (this._active) this._hide();
    else this._show();
  }
}

export const _commandPanel = new CommandPanel();
