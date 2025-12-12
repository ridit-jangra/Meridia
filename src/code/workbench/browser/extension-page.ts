import { _addContent } from "../common/tabs.js";
import { IExtension } from "../workbench.types.js";
import { CoreEl } from "./parts/core.js";

export class ExtensionPage extends CoreEl {
  constructor(private extension: IExtension) {
    super();
    this._createEl();
  }

  private _createEl() {
    this._el = document.createElement("div");
    this._el.className = "extensions";

    this._el!.innerHTML = "";

    const header = document.createElement("div");
    header.style.marginBottom = "15px";

    const name = document.createElement("h3");
    name.textContent = this.extension.name;
    name.style.margin = "0 0 5px 0";

    const version = document.createElement("span");
    version.textContent = `v${this.extension.version}`;
    version.style.color = "#007acc";
    version.style.fontSize = "12px";

    header.appendChild(name);
    header.appendChild(version);
    this._el!.appendChild(header);

    const desc = document.createElement("p");
    desc.textContent = this.extension.description;
    desc.style.margin = "10px 0";
    desc.style.lineHeight = "1.4";
    this._el!.appendChild(desc);

    const authorLabel = document.createElement("div");
    authorLabel.textContent = `Author: ${this.extension.author}`;
    authorLabel.style.color = "#666";
    authorLabel.style.fontSize = "13px";
    authorLabel.style.marginBottom = "10px";
    this._el!.appendChild(authorLabel);

    if (this.extension.readme) {
      const readmeLink = document.createElement("a");
      readmeLink.textContent = "Readme";
      readmeLink.href = this.extension.readme;
      readmeLink.target = "_blank";
      readmeLink.style.color = "#007acc";
      readmeLink.style.textDecoration = "none";
      readmeLink.style.fontSize = "13px";
      this._el!.appendChild(readmeLink);
    }
  }
}
