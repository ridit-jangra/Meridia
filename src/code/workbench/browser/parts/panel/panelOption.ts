import { CoreEl } from "../core.js";

export class PanelOption extends CoreEl {
  private _id: string;
  constructor(
    private _name: string,
    public _content?: HTMLElement,
    private _onClickCallback?: Function,
    private _icon?: string
  ) {
    super();
    if (_name) this._id = _name.toLowerCase();
    else this._id = "";

    this._createEl();
  }

  private _createEl() {
    this._el = document.createElement("span");
    if (this._icon) this._el.innerHTML = this._icon;
    else this._el.innerHTML = this._name!;

    this._el.onclick = () => {
      if (this._onClickCallback) this._onClickCallback();
    };
  }

  _toggleActive(_active: boolean) {
    this._el?.classList.toggle("active", _active);
  }
}
