import { _extensions } from "../../platform/extension/common/extension.js";
import { openExtensionTab } from "../common/extension-tab.js";
import { getThemeIcon } from "./media/icons.js";
import { CoreEl } from "./parts/core.js";

export class Extensions extends CoreEl {
  private tree!: HTMLDivElement;
  private extensionElements: HTMLDivElement[] = [];

  constructor() {
    super();
    this._createEl();
  }

  private _createEl() {
    this._el = document.createElement("div");
    this._el.className = "extensions";

    const search = document.createElement("div");
    search.className = "search";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Search extensions";

    const searchButton = document.createElement("span");
    searchButton.appendChild(getThemeIcon("search"));

    search.appendChild(input);
    search.appendChild(searchButton);

    this.tree = document.createElement("div");
    this.tree.className = "tree scrollbar-container x-disable";

    this._el.appendChild(search);
    this._el.appendChild(this.tree);

    input.oninput = (e) =>
      this._filterExtensions((e.target as HTMLInputElement).value);
    searchButton.onclick = () => this._filterExtensions(input.value);

    setTimeout(() => this._loadExtensions(), 100);
  }

  private _loadExtensions() {
    const extensions = _extensions._extensions;
    this.extensionElements = [];

    extensions.forEach((extension) => {
      const el = document.createElement("div");
      el.className = "extension";
      el.dataset.name = extension.name.toLowerCase();
      el.dataset.description = extension.description.toLowerCase();
      el.dataset.author = extension.author.toLowerCase();

      const icon = document.createElement("span");
      icon.className = "icon";
      icon.appendChild(getThemeIcon("extension"));

      const content = document.createElement("div");
      content.className = "content";

      const name = document.createElement("span");
      name.className = "name";
      name.textContent = extension.name;

      const description = document.createElement("span");
      description.className = "description";
      description.textContent = extension.description;

      const author = document.createElement("span");
      author.className = "author";
      author.textContent = extension.author;

      content.appendChild(name);
      content.appendChild(description);
      content.appendChild(author);

      el.appendChild(icon);
      el.appendChild(content);

      el.onclick = (e) => {
        e.stopPropagation();
        openExtensionTab(extension);
      };

      this.extensionElements.push(el);
      this.tree.appendChild(el);
    });
  }

  private _filterExtensions(query: string) {
    const lowerQuery = query.toLowerCase().trim();

    this.extensionElements.forEach((el) => {
      if (!el.parentNode) return;

      const matches =
        el.dataset.name!.includes(lowerQuery) ||
        el.dataset.description!.includes(lowerQuery) ||
        el.dataset.author!.includes(lowerQuery);

      el.style.display = matches || lowerQuery === "" ? "" : "none";
    });
  }
}
