import { CoreEl } from "../core.js";
import { PanelOption } from "./panelOption.js";

const storage = window.storage;

export class PanelOptions extends CoreEl {
  constructor(
    private _options: PanelOption[],
    private _parentEl: HTMLElement,
    private _className?: string,
    private _id?: string
  ) {
    super();
    this._createEl();
  }

  private _getStorageKey() {
    return this._id ? `panel-options${this._id}` : "panel-options";
  }

  private _createEl() {
    this._el = document.createElement("div");
    this._el.className = "panel-options";

    if (this._className) {
      this._el.classList.add(this._className);
    }

    const key = this._getStorageKey();
    const activeIndex = storage.get(key) ?? 0;

    this._options.forEach((_option, index) => {
      this._el?.appendChild(_option.getDomElement()!);

      const isActive = index === activeIndex;
      _option._toggleActive(isActive);

      if (_option._content && _option._el) {
        _option._el.onclick = () => {
          _option._toggleActive(true);
          this._updateContent(_option._content!);

          this._options.forEach((opt, i) => {
            if (i !== index) {
              opt._toggleActive(false);
            }
          });

          storage.store(key, index);
        };
      }
    });

    const storedActiveOption = this._options[activeIndex]!;
    this._updateContent(storedActiveOption._content!);
  }

  public _updateContent(_contentEl: HTMLElement) {
    if (_contentEl) {
      this._parentEl.innerHTML = "";
      this._parentEl.appendChild(_contentEl);
    }
  }
}
