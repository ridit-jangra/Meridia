import { _extensions } from "../../platform/extension/common/extension.js";
import { CoreEl } from "./parts/core.js";

export class Extensions extends CoreEl {
  constructor() {
    super();
    this._createEl();
  }

  private _createEl() {
    this._el = document.createElement("div");
    this._el.className = "extensions";

    const tree = document.createElement("div");
    tree.className = "tree";

    setTimeout(() => {
      const extensions = _extensions._extensions;

      extensions.forEach((extension) => {
        const el = document.createElement("div");
        el.className = "extension";

        const name = document.createElement("span");
        name.className = "name";
        name.textContent = extension.name;

        const description = document.createElement("span");
        description.className = "description";
        description.textContent = extension.description;

        const author = document.createElement("span");
        author.className = "author";
        author.textContent = extension.author;

        el.appendChild(name);
        el.appendChild(description);
        el.appendChild(author);

        tree.appendChild(el);
      });
    }, 1000);

    this._el.appendChild(tree);
  }
}
