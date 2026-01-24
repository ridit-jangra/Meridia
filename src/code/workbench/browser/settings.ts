import { getThemeIcon } from "./media/icons.js";
import { CoreEl } from "./parts/core.js";
import { SidebarTree } from "./parts/settings/sidebar-tree.js";
import { Splitter } from "./parts/splitter/splitter.js";

export class Settings extends CoreEl {
  constructor() {
    super();
    this._createEl();
  }

  private _createEl() {
    this._el = document.createElement("div");
    this._el.className = "settings";

    const header = document.createElement("div");
    header.className = "header";

    const searchBox = document.createElement("div");
    searchBox.className = "search-box";

    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "Search settings...";

    const searchIcon = document.createElement("span");
    searchIcon.innerHTML = getThemeIcon("search");

    searchBox.appendChild(searchInput);
    searchBox.appendChild(searchIcon);

    header.appendChild(searchBox);

    const sidebar = document.createElement("div");
    sidebar.className = "sidebar";

    const tree = new SidebarTree((key: string) => Function).getDomElement()!;

    sidebar.appendChild(tree);

    const content = document.createElement("div");
    content.className = "content";

    const splitter = new Splitter([sidebar, content], "horizontal", [30, 70]);

    this._el.appendChild(header);
    this._el.appendChild(splitter.getDomElement()!);
  }
}
