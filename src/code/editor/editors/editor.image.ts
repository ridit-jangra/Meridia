import { h } from "../../workbench/contrib/core/dom/h";
import { editor } from "../editor";
import type { ICustomEditor, ICustomModel } from "../../../types/editor.types";
import { FS_READ_BASE_64 } from "../../../../shared/ipc/channels";

const el = h("div", {
  class:
    "image-editor h-full w-full flex items-center justify-center overflow-auto",
});

const _: ICustomEditor = {
  dispose() {},
  parent_el: null as any,
  el,
  extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "bmp"],
};

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  bmp: "image/bmp",
};

export class image_editor extends editor<ICustomEditor, ICustomModel> {
  private current_blob_url: string | null = null;

  constructor() {
    super(_);
  }

  public mount(parent?: HTMLElement): void {
    if (!parent) return;
    this.editor.parent_el = parent;
    parent.appendChild(this.editor.el);
  }

  public set_visible(visible = true): void {
    this.editor.el.classList.toggle("hidden", !visible);
  }

  public create_model(file_path: string): ICustomModel {
    return {
      uri: file_path,
      dispose() {},
      cursor_position: { line: 1, col: 1 },
    };
  }

  public add_model(model: ICustomModel): void {
    this.models.push(model);
  }

  public get_model(uri: string): ICustomModel | undefined {
    return this.models.find((m) => m.uri === uri) as ICustomModel | undefined;
  }

  public async set_model_active(uri: string): Promise<void> {
    const model = this.get_model(uri);
    if (!model) return;
    this.active_model = model;
    await this.update_editor();
    this.set_visible(true);
  }

  public update_model_uri(old_path: string, new_path: string): void {
    const model = this.get_model(old_path) as ICustomModel | undefined;
    if (!model) return;
    model.uri = new_path;
  }

  public async update_editor(): Promise<void> {
    if (!this.active_model) return;

    if (this.current_blob_url) {
      URL.revokeObjectURL(this.current_blob_url);
      this.current_blob_url = null;
    }

    this.editor.el.innerHTML = "";

    const uri = this.active_model.uri;
    const ext = uri.split(".").pop()?.toLowerCase() ?? "png";
    const mime = MIME[ext] ?? "image/png";

    const base64 = await window.ipc.invoke<string>(FS_READ_BASE_64, uri);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    const src = URL.createObjectURL(blob);
    this.current_blob_url = src;

    const img = h("img", {
      class: "max-w-full max-h-full object-contain select-none",
      draggable: "false",
    }) as HTMLImageElement;

    img.src = src;
    this.editor.el.appendChild(img);
  }

  public dispose_model(uri: string): void {
    const index = this.models.findIndex((m) => m.uri === uri);
    if (index === -1) return;
    this.models[index].dispose();
    this.models.splice(index, 1);
    if (this.active_model?.uri === uri) {
      if (this.current_blob_url) {
        URL.revokeObjectURL(this.current_blob_url);
        this.current_blob_url = null;
      }
      this.active_model = null;
      this.editor.el.innerHTML = "";
    }
  }

  public dispose(): void {
    if (this.current_blob_url) {
      URL.revokeObjectURL(this.current_blob_url);
      this.current_blob_url = null;
    }
    this.models.forEach((m) => m.dispose());
    this.models.length = 0;
  }
}
