import { CoreEl } from "./workbench.part.el.js";
import { PanelOption } from "./workbench.part.panel.options.option.js";

export class PanelOptions extends CoreEl {
  constructor(
    private _options: PanelOption[],
    private _parentEl: HTMLElement,
    private _className?: string
  ) {
    super();
    this._createEl();
  }

  private _createEl() {
    this._el = document.createElement("div");
    this._el.className = "panel-options";

    if (this._className) {
      this._el.classList.add(this._className);
    }

    this._options.forEach((_option) => {
      this._el?.appendChild(_option.getDomElement()!);
      if (_option._content) {
        _option._el!.onclick = () => {
          console.log(_option._content);
          this._updateContent(_option._content!);
        };
      }
    });

    const _active = this._options[0]!;
    _active._toggleActive();
    this._updateContent(_active._content!);
  }

  public _updateContent(_contentEl: HTMLElement) {
    if (_contentEl) {
      this._parentEl.innerHTML = "";
      this._parentEl.appendChild(_contentEl);
    }
  }
}
