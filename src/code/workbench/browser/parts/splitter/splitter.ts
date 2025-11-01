import { TDragState, TSplitterDirection } from "../../../workbench.types.js";
import { CoreEl } from "../core.js";

export class Splitter extends CoreEl {
  private _panels: HTMLElement[];
  private _direction: TSplitterDirection;
  private _onSizeChangeCallback?: Function;
  private _panelsVisible: boolean[];
  private _sizes!: number[];
  private _originalSizes: number[];
  private _gutters: HTMLElement[] = [];
  private _minSize = 5;
  private _storageKey: string;

  constructor(
    panels: HTMLElement[],
    direction: TSplitterDirection = "horizontal",
    sizes?: number[],
    onSizeChangeCallback?: Function,
    storageKey?: string
  ) {
    super();
    this._panels = panels;
    this._direction = direction;
    this._onSizeChangeCallback = onSizeChangeCallback!;
    this._panelsVisible = panels.map(() => true);
    this._storageKey = storageKey || `splitter-${direction}-${panels.length}`;

    this._load(sizes);
    this._originalSizes = [...this._sizes];

    this._create();
    this._applySizes();
  }

  private _load(defaultSizes?: number[]) {
    const storedSizes = window.storage.get(this._storageKey);

    if (
      storedSizes &&
      Array.isArray(storedSizes) &&
      storedSizes.length === this._panels.length
    ) {
      this._sizes = [...storedSizes];
    } else {
      this._sizes =
        defaultSizes ??
        new Array(this._panels.length).fill(100 / this._panels.length);
    }
  }

  private _save() {
    window.storage.store(this._storageKey, [...this._sizes]);
  }

  private _create() {
    this._el = document.createElement("div");
    this._el.className =
      this._direction === "horizontal"
        ? "splitter-horizontal"
        : "splitter-vertical";

    this._el.style.display = "flex";
    this._el.style.flexDirection =
      this._direction === "horizontal" ? "row" : "column";
    this._el.style.width = "100%";
    this._el.style.boxSizing = "border-box";
    this._el.style.padding = "0";
    this._el.style.margin = "0";
    this._el.style.border = "none";
    this._el.innerHTML = "";

    for (let i = 0; i < this._panels.length; i++) {
      const panel = this._panels[i];
      if (!panel) return;

      panel.style.flexShrink = "0";
      panel.style.overflow = "auto";
      panel.style.minWidth = "0";
      panel.style.minHeight = "0";
      panel.style.boxSizing = "border-box";

      this._el.appendChild(panel);

      if (i < this._panels.length - 1) {
        const gutter = document.createElement("div");
        gutter.className =
          this._direction === "horizontal"
            ? "gutter gutter-horizontal"
            : "gutter gutter-vertical";
        gutter.style.cursor =
          this._direction === "horizontal" ? "col-resize" : "row-resize";
        gutter.style.flexShrink = "0";
        gutter.style.userSelect = "none";
        gutter.style.boxSizing = "border-box";

        if (this._direction === "horizontal") {
          gutter.style.width = "10px";
          gutter.style.height = "100%";
        } else {
          gutter.style.height = "10px";
          gutter.style.width = "100%";
        }

        this._el.appendChild(gutter);
        this._gutters.push(gutter);
        this._addGutter(gutter, i);
      }
    }
  }

  private _addGutter(gutter: HTMLElement, gutterIndex: number) {
    let dragState: TDragState | null = null;

    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      gutter.setPointerCapture(e.pointerId);

      dragState = {
        startPos: this._direction === "horizontal" ? e.clientX : e.clientY,
        prevPanelIndex: gutterIndex,
        nextPanelIndex: gutterIndex + 1,
        prevPanelSize: this._sizes[gutterIndex]!,
        nextPanelSize: this._sizes[gutterIndex + 1]!,
        direction: this._direction,
      };

      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp, { once: true });
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragState) return;
      e.preventDefault();

      const currentPos =
        this._direction === "horizontal" ? e.clientX : e.clientY;
      const delta = currentPos - dragState.startPos;
      const splitterSize =
        this._direction === "horizontal"
          ? this._el!.clientWidth
          : this._el!.clientHeight;
      const percentDelta = (delta / splitterSize) * 100;

      let newPrevSize = dragState.prevPanelSize + percentDelta;
      let newNextSize = dragState.nextPanelSize - percentDelta;

      if (newPrevSize < this._minSize) {
        newPrevSize = this._minSize;
        newNextSize =
          dragState.prevPanelSize + dragState.nextPanelSize - newPrevSize;
      } else if (newNextSize < this._minSize) {
        newNextSize = this._minSize;
        newPrevSize =
          dragState.prevPanelSize + dragState.nextPanelSize - newNextSize;
      }

      this._sizes = [...this._sizes];
      this._sizes[dragState.prevPanelIndex] = newPrevSize;
      this._sizes[dragState.nextPanelIndex] = newNextSize;

      this._originalSizes[dragState.prevPanelIndex] = newPrevSize;
      this._originalSizes[dragState.nextPanelIndex] = newNextSize;

      this._applySizes();
      this._save();

      if (this._onSizeChangeCallback) this._onSizeChangeCallback();
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!dragState) return;
      gutter.releasePointerCapture(e.pointerId);
      document.removeEventListener("pointermove", onPointerMove);
      dragState = null;
    };

    gutter.addEventListener("pointerdown", onPointerDown);
  }

  _collapsePanel(index: number) {
    if (index < 0 || index >= this._panels.length) return;

    this._panelsVisible[index] = false;
    this._panels[index]!.style.display = "none";

    const visibleCount = this._panelsVisible.filter((v) => v).length;
    if (visibleCount === 0) return;

    const equalSize = 100 / visibleCount;
    this._sizes = this._panelsVisible.map((v) => (v ? equalSize : 0));
    this._applySizes();
    this._save();

    if (this._onSizeChangeCallback) this._onSizeChangeCallback();
  }

  private _applySizes() {
    let totalVisibleSize = 0;
    for (let i = 0; i < this._panels.length; i++) {
      if (this._panelsVisible[i]) {
        totalVisibleSize += this._sizes[i] ?? 0;
      }
    }

    const tolerance = 0.1;
    const shouldNormalize = Math.abs(totalVisibleSize - 100) > tolerance;

    this._panels.forEach((panel, i) => {
      if (this._panelsVisible[i]) {
        let size: number;
        if (shouldNormalize && totalVisibleSize > 0) {
          size = (this._sizes[i]! / totalVisibleSize) * 100;
        } else {
          size = this._sizes[i]!;
        }

        if (this._direction === "horizontal") {
          panel.style.width = `${size}%`;
          panel.style.height = "100%";
          panel.style.display = "";
        } else {
          panel.style.height = `${size}%`;
          panel.style.width = "100%";
          panel.style.display = "";
        }
      } else {
        panel.style.display = "none";
      }
    });

    this._gutters.forEach((gutter, i) => {
      if (this._panelsVisible[i] && this._panelsVisible[i + 1]) {
        gutter.style.display = "";
      } else {
        gutter.style.display = "none";
      }
    });
  }

  private _getMiddleIndex(): number {
    if (this._panels.length === 3) {
      return 1;
    }

    return Math.floor(this._panels.length / 2);
  }

  private _redistribute(toggledIndex: number, isShowing: boolean) {
    const middleIndex = this._getMiddleIndex();

    if (this._panels.length === 3 && middleIndex !== toggledIndex) {
      const currentSizes = [...this._sizes];

      if (isShowing) {
        let restoredSize = this._originalSizes[toggledIndex];

        if (!restoredSize || restoredSize === 0) {
          restoredSize = 100 / this._panels.length;
        }

        const middleCurrentSize = currentSizes[middleIndex]!;
        const newMiddleSize = Math.max(
          this._minSize,
          middleCurrentSize - restoredSize
        );

        this._sizes[toggledIndex] = restoredSize;
        this._sizes[middleIndex] = newMiddleSize;

        for (let i = 0; i < this._panels.length; i++) {
          if (i !== toggledIndex && i !== middleIndex) {
            this._sizes[i] = currentSizes[i]!;
          }
        }
      } else {
        const hiddenSize = currentSizes[toggledIndex]!;

        this._sizes[middleIndex] = currentSizes[middleIndex]! + hiddenSize;
        this._sizes[toggledIndex] = 0;

        for (let i = 0; i < this._panels.length; i++) {
          if (i !== toggledIndex && i !== middleIndex) {
            this._sizes[i] = currentSizes[i]!;
          }
        }
      }
    } else {
      const visibleCount = this._panelsVisible.filter((v) => v).length;

      if (visibleCount === 0) {
        this._panelsVisible[0] = true;
        this._sizes = this._sizes.map((_, i) => (i === 0 ? 100 : 0));
        return;
      }

      if (isShowing) {
        let targetSize = this._originalSizes[toggledIndex];
        if (!targetSize || targetSize === 0) {
          targetSize = 100 / this._panels.length;
        }

        const remainingSpace = 100 - targetSize;
        const otherVisibleCount = visibleCount - 1;
        const sizeForOthers =
          otherVisibleCount > 0 ? remainingSpace / otherVisibleCount : 0;

        this._sizes = this._panelsVisible.map((visible, i) => {
          if (!visible) return 0;
          if (i === toggledIndex) return targetSize;
          return sizeForOthers;
        });
      } else {
        const equalSize = 100 / visibleCount;
        this._sizes = this._panelsVisible.map((visible) =>
          visible ? equalSize : 0
        );
      }
    }
  }

  togglePanel(index: number) {
    if (index < 0 || index >= this._panels.length) return;

    const wasVisible = this._panelsVisible[index];
    const beforeVisibleCount = this._panelsVisible.filter(Boolean).length;
    if (wasVisible && beforeVisibleCount === 1) {
      return;
    }

    this._panelsVisible[index] = !wasVisible;

    this._redistribute(index, !wasVisible);
    this._save();

    // Delay size application for smoother UI update
    setTimeout(() => {
      this._applySizes();
      if (this._onSizeChangeCallback) this._onSizeChangeCallback();
    }, 10);
  }

  setPanel(index: number, visibility: boolean) {
    if (index < 0 || index >= this._panels.length) return;

    const currentVisibility = this._panelsVisible[index];

    const beforeVisibleCount = this._panelsVisible.filter(Boolean).length;
    if (currentVisibility && !visibility && beforeVisibleCount === 1) {
      return;
    }

    if (currentVisibility === visibility) {
      return;
    }

    this._panels[index]!.style.transition = "none";

    this._panelsVisible[index] = visibility;

    this._redistribute(index, visibility);
    this._applySizes();
    this._save();

    void this._panels[index]!.offsetWidth;

    this._panels[index]!.style.transition = "";

    if (this._onSizeChangeCallback) this._onSizeChangeCallback();
  }

  getIndex(el: HTMLElement): number {
    let current: HTMLElement | null = el;

    const index = this._panels.indexOf(current);
    if (index !== -1) return index;

    return index;
  }

  setSizes(newSizes: number[]) {
    if (!Array.isArray(newSizes) || newSizes.length !== this._panels.length) {
      return;
    }

    if (!newSizes.every((size) => typeof size === "number" && size >= 0)) {
      return;
    }

    const total = newSizes.reduce((sum, size) => sum + size, 0);

    let normalizedSizes: number[];
    if (Math.abs(total - 100) > 0.1) {
      if (total === 0) {
        const visibleCount = this._panelsVisible.filter((v) => v).length;
        const equalSize = visibleCount > 0 ? 100 / visibleCount : 0;
        normalizedSizes = this._panelsVisible.map((visible) =>
          visible ? equalSize : 0
        );
      } else {
        normalizedSizes = newSizes.map((size) => (size / total) * 100);
      }
    } else {
      normalizedSizes = [...newSizes];
    }

    for (let i = 0; i < normalizedSizes.length; i++) {
      if (this._panelsVisible[i] && normalizedSizes[i]! < this._minSize) {
        normalizedSizes[i] = this._minSize;
      } else if (!this._panelsVisible[i]) {
        normalizedSizes[i] = 0;
      }
    }

    const adjustedTotal = normalizedSizes.reduce((sum, size) => sum + size, 0);

    if (adjustedTotal > 100) {
      const scaleFactor = 100 / adjustedTotal;
      normalizedSizes = normalizedSizes.map((size) => size * scaleFactor);
    }

    this._sizes = [...normalizedSizes];
    this._originalSizes = [...normalizedSizes];

    this._applySizes();

    this._save();

    if (this._onSizeChangeCallback) {
      this._onSizeChangeCallback();
    }
  }
}
