import { registerStandalone } from "../../workbench/common/class.js";
import { addStandaloneForExtension } from "../common/standalones.js";
import { Standalone } from "./standalone.js";

export class ImageViewer extends Standalone {
  private _layout = document.querySelector(".editor-area") as HTMLElement;
  private _viewer!: HTMLDivElement;
  _extensions = [".svg", ".jpg", ".jpeg", ".png", ".webpg", ".ico"];

  private _isMounted = false;

  _mount() {
    if (this._isMounted) return;
    this._type = "viewer";

    const _layout = document.querySelector(".editor-area") as HTMLElement;

    this._viewer = document.createElement("div");
    this._viewer.className = "image-viewer scrollbar-container";

    addStandaloneForExtension(this._extensions, this);

    _layout.appendChild(this._viewer);

    this._isMounted = true;
  }

  _open(path: string) {
    this._viewer.innerHTML = "";
    const _image = document.createElement("img");
    _image.src = `file:///${path}`;
    _image.alt = window.path.basename(path);

    this._viewer.appendChild(_image);
  }

  _close() {
    this._viewer.innerHTML = "";
  }

  _setVisiblity(visible: boolean) {
    if (visible) this._viewer.style.display = "flex";
    else this._viewer.style.display = "none";
  }
}

export const _imageViewer = new ImageViewer();
registerStandalone("image-viewer", _imageViewer);
