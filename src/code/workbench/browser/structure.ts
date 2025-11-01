import { CoreEl } from "./parts/core.js";

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
