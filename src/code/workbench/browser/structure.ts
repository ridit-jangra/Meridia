import { CoreEl } from "./parts/el.js";

export class Structure extends CoreEl {
  constructor() {
    super();
    this._createEl();
  }

  private _createEl() {
    this._el = document.createElement("div");
    this._el.className = "structure";
  }
}
