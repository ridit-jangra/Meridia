import { registerStandalone } from "../../../common/class.js";
import { getThemeIcon } from "../../media/icons.js";
import { CoreEl } from "../core.js";
import { Splitter } from "../splitter/splitter.js";

const pypi = window.pypi;

export class Python extends CoreEl {
  constructor() {
    super();
    this._createEl();
  }

  private async _createEl() {
    this._el = document.createElement("div");
    this._el.className = "package-template";

    const sidebar = document.createElement("div");
    sidebar.className = "sidebar";

    const inputWrapper = document.createElement("div");
    inputWrapper.className = "input-wrapper";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Enter the package name.";

    const search = document.createElement("span");
    search.innerHTML = getThemeIcon("search");

    inputWrapper.appendChild(input);
    inputWrapper.appendChild(search);

    sidebar.appendChild(inputWrapper);

    const content = document.createElement("div");

    const splitter = new Splitter([sidebar, content], "horizontal", [30, 70]);

    console.log(await pypi.getPackagesList("panads"));

    this._el.appendChild(splitter.getDomElement()!);
  }
}

export const _pythonPackageManager = new Python();
registerStandalone("python-package-manager", _pythonPackageManager);
