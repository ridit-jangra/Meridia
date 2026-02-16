import { h } from "../../../ui";
import { editor } from "../editor";
import { ICustomEditor } from "../editor.types";

const el = h("div", { class: "image-editor h-full w-full" });

const _: ICustomEditor = {
  dispose() {},
  parent_el: null as any,
  el,
  extensions: ["png", "jpg", "jpeg", "svg", "avif"],
};

export class image_editor extends editor {
  constructor() {
    super(_);
  }

  public mount(parent?: HTMLElement): void {
    if (parent) {
      this.editor.parent_el = parent;
      parent.appendChild(this.editor.el);
    }
  }

  public update_editor(): void {
    if (!this.active_model) {
      return;
    }

    this.editor.el.innerHTML = "";
    this.editor.el.textContent = this.active_model.uri;
  }
}
