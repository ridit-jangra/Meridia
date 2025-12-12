import { select, watch } from "../../../common/store/selector.js";
import { update_panel_state } from "../../../common/store/slice.js";
import { dispatch } from "../../../common/store/store.js";
import { CoreEl } from "../core.js";
import { PanelOption } from "./panelOption.js";

const storage = window.storage;

export class PanelOptions extends CoreEl {
  private _lastValidIndex = -1;

  constructor(
    private _options: PanelOption[],
    private _parentEl: HTMLElement,
    private _className?: string,
    private _id?: string
  ) {
    super();
    this._createEl();
    this._watchPanelState();
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
    const activeIndex = storage.get(key) ?? -1;

    if (activeIndex >= 0) {
      this._lastValidIndex = activeIndex;
    }

    this._options.forEach((_option, index) => {
      this._el?.appendChild(_option.getDomElement()!);
      const isActive = index === activeIndex && activeIndex >= 0;
      _option._toggleActive(isActive);

      if (_option._content && _option._el) {
        _option._el.onclick = () => {
          const currentIndex = this._options.indexOf(_option);
          const currentActiveIndex = storage.get(this._getStorageKey()) ?? -1;
          const wasActive = currentIndex === currentActiveIndex;

          if (wasActive) {
            this._parentEl.innerHTML = "";
            this._options.forEach((opt) => opt._toggleActive(false));

            if (this._id?.startsWith("left")) {
              const _state = select((s) => s.main.panel_state);
              dispatch(update_panel_state({ ..._state, left: false }));
            } else if (this._id?.startsWith("right")) {
              const _state = select((s) => s.main.panel_state);
              dispatch(update_panel_state({ ..._state, right: false }));
            }
            storage.store(this._getStorageKey(), -1);
          } else {
            this._lastValidIndex = currentIndex;

            if (this._id?.startsWith("left")) {
              const _state = select((s) => s.main.panel_state);
              dispatch(update_panel_state({ ..._state, left: true }));
            } else if (this._id?.startsWith("right")) {
              const _state = select((s) => s.main.panel_state);
              dispatch(update_panel_state({ ..._state, right: true }));
            }

            this._updateContent(_option._content!);
            this._options.forEach((opt, i) => {
              opt._toggleActive(i === currentIndex);
            });
            storage.store(this._getStorageKey(), currentIndex);
          }
        };
      }
    });

    if (activeIndex >= 0 && activeIndex < this._options.length) {
      const storedActiveOption = this._options[activeIndex]!;
      this._updateContent(storedActiveOption._content!);
    } else {
      this._parentEl.innerHTML = "";
    }
  }

  private _watchPanelState() {
    watch(
      (s) => s.main.panel_state,
      (_state) => {
        if (this._id?.startsWith("left")) {
          if (!_state.left) {
            this._parentEl.innerHTML = "";
            this._options.forEach((opt) => opt._toggleActive(false));
            storage.store(this._getStorageKey(), -1);
          } else if (
            this._lastValidIndex >= 0 &&
            this._lastValidIndex < this._options.length
          ) {
            const lastActiveOption = this._options[this._lastValidIndex]!;
            this._updateContent(lastActiveOption._content!);
            this._options.forEach((opt, i) => {
              opt._toggleActive(i === this._lastValidIndex);
            });
          }
        } else if (this._id?.startsWith("right")) {
          if (!_state.right) {
            this._parentEl.innerHTML = "";
            this._options.forEach((opt) => opt._toggleActive(false));
            storage.store(this._getStorageKey(), -1);
          } else if (
            this._lastValidIndex >= 0 &&
            this._lastValidIndex < this._options.length
          ) {
            const lastActiveOption = this._options[this._lastValidIndex]!;
            this._updateContent(lastActiveOption._content!);
            this._options.forEach((opt, i) => {
              opt._toggleActive(i === this._lastValidIndex);
            });
          }
        }
      }
    );
  }

  public _updateContent(_contentEl: HTMLElement) {
    if (_contentEl) {
      this._parentEl.innerHTML = "";
      this._parentEl.appendChild(_contentEl);
    }
  }
}
