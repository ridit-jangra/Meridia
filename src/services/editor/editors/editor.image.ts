import { h } from "../../../ui";
import { editor } from "../editor";
import { ICustomEditor } from "../editor.types";

const el = h("div", { class: "image-editor h-full w-full" });

const _: ICustomEditor = {
  dispose() {},
  parent_el: null as any,
  el,
  extensions: [
    "png",
    "jpg",
    "jpeg",
    "svg",
    "avif",
    "ico",
    "gif",
    "bmp",
    "webp",
    "tiff",
    "tif",
    "heic",
    "heif",
    "jfif",
    "pjpeg",
    "pjp",
    "apng",
    "raw",
    "cr2",
    "nef",
    "arw",
    "dng",
    "orf",
    "rw2",
    "pef",
    "sr2",
    "x3f",
    "raf",
    "srw",
    "crw",
    "kdc",
    "dcr",
    "mrw",
    "erf",
    "mef",
    "mos",
    "nrw",
    "ptx",
    "pxn",
    "r3d",
    "rwl",
    "rwz",
    "srf",
    "3fr",
    "ari",
    "bay",
    "cap",
    "dcs",
    "drf",
    "eip",
    "fff",
    "iiq",
    "k25",
    "mdc",
    "mfw",
    "nwb",
    "orf",
    "ori",
    "pcd",
    "raf",
    "raw",
    "rw2",
    "sr2",
    "srf",
    "sti",
    "x3f",
    "exr",
    "hdr",
    "pic",
    "pict",
    "psd",
    "psb",
    "xcf",
    "ai",
    "eps",
    "pdf",
    "indd",
    "dds",
    "ktx",
    "pkm",
    "pvr",
    "astc",
  ],
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

    const img = h("img", {});
    img.src = this.active_model.uri;
    this.editor.el.appendChild(img);
  }
}
