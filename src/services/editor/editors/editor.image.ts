import { h } from "../../../ui";
import { editor } from "../editor";
import type { ICustomEditor, ICustomModel } from "../editor.types";

const el = h("div", { class: "image-editor h-full w-full" });

const _: ICustomEditor = {
  dispose() {},
  parent_el: null as any,
  el,
  extensions: ["png", "jpg", "jpeg", "svg"],
};

export class image_editor extends editor<ICustomEditor, ICustomModel> {
  constructor() {
    super(_);
  }

  public mount(parent?: HTMLElement): void {
    if (!parent) return;
    this.editor.parent_el = parent;
    parent.appendChild(this.editor.el);
  }

  public create_model(file_path: string): ICustomModel {
    return {
      uri: file_path,
      dispose() {},
      cursor_position: { line: 1, col: 1 },
    };
  }

  public update_editor(): void {
    if (!this.active_model) return;

    this.editor.el.innerHTML = "";
    const img = h("img", {});
    img.src = this.active_model.uri;
    this.editor.el.appendChild(img);
  }
}
