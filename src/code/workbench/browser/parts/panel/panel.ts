import { CoreEl } from "../core.js";

export class Panel extends CoreEl {
  constructor(private _className?: string) {
    super();
    this._createEl();
  }

  private _createEl() {
    this._el = document.createElement("div");
    this._el.className = "panel";
    this._el.classList.add(this._className!);
  }
}
