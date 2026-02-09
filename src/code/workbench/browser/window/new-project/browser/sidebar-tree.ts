import { IProjectTree, IProjectTreeItem } from "../../../../workbench.types";
import { CoreEl } from "../../../parts/core.js";
import { projectTree } from "../common/projects-data.js";
import { getThemeIcon } from "../../../media/icons";

export class SidebarTree extends CoreEl {
  private expandedNodes: Set<string> = new Set();
  private renderedNodes: Map<string, HTMLElement> = new Map();
  private renderedChildContainers: Map<string, HTMLElement> = new Map();

  constructor(private onNodeClick: Function) {
    super();
    this._restoreExpanded();
    this._createEl();
  }

  private _restoreExpanded() {
    const saved = window.storage?.get("projects-expanded-nodes");
    if (Array.isArray(saved)) {
      this.expandedNodes = new Set(saved as string[]);
    }
  }

  private _persistExpanded() {
    window.storage?.store(
      "projects-expanded-nodes",
      Array.from(this.expandedNodes),
    );
  }

  private _createNodeChildren(nodeKey: string): HTMLElement {
    const childrenContainer = document.createElement("div");
    childrenContainer.className = "child-nodes";
    childrenContainer.dataset.nodeId = nodeKey;

    const isExpanded = this.expandedNodes.has(nodeKey);
    if (isExpanded) {
      childrenContainer.style.height = "auto";
      childrenContainer.style.opacity = "1";
      childrenContainer.style.pointerEvents = "auto";
      childrenContainer.style.visibility = "visible";
      childrenContainer.classList.add("expanded");
    } else {
      childrenContainer.style.height = "0px";
      childrenContainer.style.opacity = "0";
      childrenContainer.style.pointerEvents = "none";
      childrenContainer.style.visibility = "hidden";
      childrenContainer.classList.remove("expanded");
    }

    return childrenContainer;
  }

  private _toggleNode(nodeKey: string, nodeEl: HTMLElement) {
    const isExpanded = this.expandedNodes.has(nodeKey);
    const icon = nodeEl.querySelector(".icon.toggle") as HTMLElement | null;
    const childrenContainer = this.renderedChildContainers.get(nodeKey);
    if (!childrenContainer) return;

    if (isExpanded) {
      this.expandedNodes.delete(nodeKey);
      icon?.classList.remove("expanded");

      childrenContainer.style.height = childrenContainer.scrollHeight + "px";
      childrenContainer.offsetHeight;
      childrenContainer.style.transition =
        "height 0.25s ease, opacity 0.25s ease";
      childrenContainer.style.height = "0px";
      childrenContainer.style.opacity = "0";
      childrenContainer.style.pointerEvents = "none";
      childrenContainer.style.visibility = "hidden";
      childrenContainer.classList.remove("expanded");
    } else {
      this.expandedNodes.add(nodeKey);
      icon?.classList.add("expanded");

      childrenContainer.style.transition = "none";
      childrenContainer.style.height = "0px";
      childrenContainer.style.opacity = "0";
      childrenContainer.style.pointerEvents = "none";
      childrenContainer.style.visibility = "hidden";
      childrenContainer.offsetHeight;

      const height = childrenContainer.scrollHeight;
      childrenContainer.style.transition =
        "height 0.25s ease, opacity 0.25s ease";
      childrenContainer.style.height = height + "px";
      childrenContainer.style.opacity = "1";
      childrenContainer.style.pointerEvents = "auto";
      childrenContainer.style.visibility = "visible";

      setTimeout(() => {
        if (this.expandedNodes.has(nodeKey)) {
          childrenContainer.style.height = "auto";
          childrenContainer.classList.add("expanded");
        }
      }, 250);
    }

    this._persistExpanded();
  }

  private _createNode(node: IProjectTree): HTMLElement {
    const row = document.createElement("div");
    row.className = "node";
    row.dataset.nodeId = node.key;

    const toggleIcon = document.createElement("span");
    toggleIcon.className = "icon toggle";
    toggleIcon.appendChild(getThemeIcon("chevronRight"));
    toggleIcon.style.cursor = "pointer";

    const langIcon = document.createElement("span");
    langIcon.className = "icon";
    langIcon.innerHTML = node.icon;

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = node.name;

    const isExpanded = this.expandedNodes.has(node.key);
    if (isExpanded) toggleIcon.classList.add("expanded");

    const toggleHandler = (e: MouseEvent) => {
      e.stopPropagation();
      this._toggleNode(node.key, row);
    };

    toggleIcon.onclick = toggleHandler;
    name.onclick = toggleHandler;
    row.onclick = toggleHandler;

    row.appendChild(toggleIcon);
    row.appendChild(langIcon);
    row.appendChild(name);

    this.renderedNodes.set(node.key, row);

    const childrenContainer = this._createNodeChildren(node.key);
    this.renderedChildContainers.set(node.key, childrenContainer);

    node.children.forEach((child: IProjectTreeItem) => {
      const childEl = document.createElement("div");
      childEl.className = "node";
      childEl.dataset.nodeId = child.key;
      childEl.style.paddingLeft = "30px";

      const childIcon = document.createElement("span");
      childIcon.className = "icon";

      childIcon.appendChild(getThemeIcon(child.icon ?? "framework"));

      const childName = document.createElement("span");
      childName.className = "name";
      childName.textContent = child.name;

      childEl.onclick = () => {
        this.onNodeClick(child.key);
      };

      childEl.appendChild(childIcon);
      childEl.appendChild(childName);
      childrenContainer.appendChild(childEl);
    });

    const wrapper = document.createElement("div");
    wrapper.className = "node-wrapper";
    wrapper.appendChild(row);
    wrapper.appendChild(childrenContainer);

    return wrapper;
  }

  private _createEl() {
    this._el = document.createElement("div");
    this._el.className = "sidebar-tree scrollbar-container x-disable";

    const treeContainer = document.createElement("div");
    treeContainer.className = "tree";

    projectTree.forEach((node) => {
      const nodeWrapper = this._createNode(node);
      treeContainer.appendChild(nodeWrapper);
    });

    this._el.appendChild(treeContainer);
  }
}
