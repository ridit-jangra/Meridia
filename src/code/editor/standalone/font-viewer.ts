import { registerStandalone } from "../../workbench/common/class.js";
import { addStandaloneForExtension } from "../common/standalones.js";
import { Standalone } from "./standalone.js";

const path = window.path;

export class FontViewer extends Standalone {
  private _layout = document.querySelector(".editor-area") as HTMLElement;
  private _viewer!: HTMLDivElement;
  _extensions = [".ttf", ".woff", ".woff2", ".otf"];

  private _isMounted = false;
  private _currentFontFamily: string = "";

  _mount() {
    if (this._isMounted) return;
    this._type = "viewer";

    const _layout = document.querySelector(".editor-area") as HTMLElement;

    this._viewer = document.createElement("div");
    this._viewer.className = "font-viewer scrollbar-container";

    addStandaloneForExtension(this._extensions, this);

    _layout.appendChild(this._viewer);

    this._isMounted = true;
  }

  _open(filePath: string) {
    this._viewer.innerHTML = "";

    const fileName = path.basename(filePath);

    this._currentFontFamily = `custom-font-${Date.now()}`;

    const style = document.createElement("style");
    style.textContent = `
      @font-face {
        font-family: '${this._currentFontFamily}';
        src: url(file:///${filePath});
        font-weight: normal;
        font-style: normal;
      }
    `;
    document.head.appendChild(style);

    const _content = document.createElement("div");
    _content.className = "font-viewer-content";

    const header = document.createElement("div");
    header.className = "font-header";
    header.innerHTML = `
      <h2>${fileName}</h2>

    `;
    _content.appendChild(header);

    const samples = [
      { label: "Pangram", text: "The quick brown fox jumps over the lazy dog" },
      { label: "Uppercase", text: "ABCDEFGHIJKLMNOPQRSTUVWXYZ" },
      { label: "Lowercase", text: "abcdefghijklmnopqrstuvwxyz" },
    ];

    const fontSizes = [12, 16, 24, 32, 48, 64, 96];

    samples.forEach((sample) => {
      const section = document.createElement("div");
      section.className = "font-sample-section";

      const sectionLabel = document.createElement("h3");
      sectionLabel.textContent = sample.label;
      sectionLabel.className = "sample-label";
      section.appendChild(sectionLabel);

      fontSizes.forEach((size) => {
        const sampleBlock = document.createElement("div");
        sampleBlock.className = "font-sample-block";

        const textPreview = document.createElement("div");
        textPreview.className = "font-preview";
        textPreview.style.fontFamily = `'${this._currentFontFamily}', sans-serif`;
        textPreview.style.fontSize = `${size}px`;
        textPreview.textContent = sample.text;
        sampleBlock.appendChild(textPreview);

        section.appendChild(sampleBlock);
      });

      _content.appendChild(section);
    });

    this._viewer.appendChild(_content);
  }

  _close() {
    this._viewer.innerHTML = "";

    this._currentFontFamily = "";
  }

  _setVisiblity(visible: boolean) {
    if (visible) this._viewer.style.display = "flex";
    else this._viewer.style.display = "none";
  }
}

export const _fontViewer = new FontViewer();
registerStandalone("font-viewer", _fontViewer);
