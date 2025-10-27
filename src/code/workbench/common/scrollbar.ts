import { IScrollbarState } from "../types.js";
import PerfectScrollbar from "perfect-scrollbar";

class ScrollbarManager {
  private _scrollbars = new Map<Element, PerfectScrollbar>();
  private _destroyedScrollbars = new Map<string, IScrollbarState>();
  private _globalObserver!: MutationObserver;
  private _elementObservers = new Map<Element, MutationObserver>();

  constructor() {
    this._init();
    this._setup();
  }

  private _generateKey(element: Element): string {
    const id = element.id;
    const className = element.className;
    const tagName = element.tagName;
    const innerHTML = element.innerHTML.substring(0, 100);
    const attributes = Array.from(element.attributes)
      .map((attr) => `${attr.name}="${attr.value}"`)
      .sort()
      .join("|");

    return `${tagName}:${id}:${className}:${innerHTML}:${attributes}`;
  }

  private _captureStyle(element: Element): IScrollbarState {
    const yDisable = element.classList.contains("y-disable");
    const xDisable = element.classList.contains("x-disable");

    const attributes: Record<string, string> = {};
    Array.from(element.attributes).forEach((attr) => {
      attributes[attr.name] = attr.value;
    });

    return {
      id: element.id,
      className: element.className,
      scrollTop: element.scrollTop,
      scrollLeft: element.scrollLeft,
      config: {
        suppressScrollX: xDisable,
        suppressScrollY: yDisable,
      },
      innerHTML: element.innerHTML,
      attributes,
    };
  }

  private _match(element: Element, state: IScrollbarState): boolean {
    const hasMatchingId = state.id && element.id === state.id;
    const hasMatchingClass = element.className === state.className;
    const hasMatchingInnerHTML = element.innerHTML === state.innerHTML;

    const currentAttrs = Array.from(element.attributes);
    const stateAttrKeys = Object.keys(state.attributes);
    const matchingAttrs = currentAttrs.filter(
      (attr) => state.attributes[attr.name] === attr.value
    ).length;

    const attrSimilarity =
      matchingAttrs / Math.max(currentAttrs.length, stateAttrKeys.length);

    return (
      hasMatchingId ||
      (hasMatchingClass && hasMatchingInnerHTML && attrSimilarity > 0.8)
    );
  }

  private _create(element: Element, state?: IScrollbarState): PerfectScrollbar {
    const config = state?.config || {
      suppressScrollX: element.classList.contains("x-disable"),
      suppressScrollY: element.classList.contains("y-disable"),
    };

    const scrollbar = new PerfectScrollbar(element, {
      suppressScrollX: config.suppressScrollX,
      suppressScrollY: config.suppressScrollY,
      useBothWheelAxes: true,
      wheelPropagation: false,
    });

    if (state) {
      setTimeout(() => {
        element.scrollTop = state.scrollTop;
        element.scrollLeft = state.scrollLeft;
        scrollbar.update();
      }, 0);
    }

    this._scrollbars.set(element, scrollbar);
    this._setupObserver(element, scrollbar);
    this._setupScrollVisibility(element);
    return scrollbar;
  }

  private _setupObserver(element: Element, scrollbar: PerfectScrollbar): void {
    let updateTimeout: NodeJS.Timeout;
    const debouncedUpdate = () => {
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(() => {
        if (this._scrollbars.has(element)) {
          scrollbar.update();
        }
      }, 16);
    };

    const mutationObserver = new MutationObserver((mutations) => {
      const hasRelevantChanges = mutations.some(
        (mutation) =>
          mutation.type === "childList" ||
          (mutation.type === "attributes" && mutation.attributeName === "style")
      );

      if (hasRelevantChanges) {
        debouncedUpdate();
      }
    });

    mutationObserver.observe(element, {
      childList: false,
      subtree: true,
      attributes: true,
      attributeFilter: ["style"],
    });

    this._elementObservers.set(element, mutationObserver);
  }

  private _setupScrollVisibility(element: Element): void {
    let hideTimeout: NodeJS.Timeout;

    const showScrollbar = () => {
      element.classList.add("scrolling-active");
      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        element.classList.remove("scrolling-active");
      }, 1000);
    };

    element.addEventListener("ps-scroll-y", showScrollbar);
    element.addEventListener("ps-scroll-x", showScrollbar);
  }

  private _setup(): void {
    this._globalObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;

            const scrollbarElements = [
              element,
              ...Array.from(element.querySelectorAll(".scrollbar-container")),
            ].filter((el) => el.classList.contains("scrollbar-container"));

            scrollbarElements.forEach((scrollbarEl) => {
              if (!this._scrollbars.has(scrollbarEl)) {
                const elementKey = this._generateKey(scrollbarEl);
                let matchingState: IScrollbarState | undefined;

                if (this._destroyedScrollbars.has(elementKey)) {
                  matchingState = this._destroyedScrollbars.get(elementKey);
                  this._destroyedScrollbars.delete(elementKey);
                } else {
                  for (const [
                    key,
                    state,
                  ] of this._destroyedScrollbars.entries()) {
                    if (this._match(scrollbarEl, state)) {
                      matchingState = state;
                      this._destroyedScrollbars.delete(key);
                      break;
                    }
                  }
                }

                this._create(scrollbarEl, matchingState);
              }
            });
          }
        });

        mutation.removedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;

            const scrollbarElements = [
              element,
              ...Array.from(element.querySelectorAll(".scrollbar-container")),
            ].filter((el) => this._scrollbars.has(el));

            scrollbarElements.forEach((scrollbarEl) => {
              const scrollbar = this._scrollbars.get(scrollbarEl);
              if (scrollbar) {
                const state = this._captureStyle(scrollbarEl);
                const elementKey = this._generateKey(scrollbarEl);

                this._destroyedScrollbars.set(elementKey, state);

                scrollbar.destroy();
                this._scrollbars.delete(scrollbarEl);

                const observer = this._elementObservers.get(scrollbarEl);
                if (observer) {
                  observer.disconnect();
                  this._elementObservers.delete(scrollbarEl);
                }
              }
            });
          }
        });
      });
    });

    this._globalObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private _init(): void {
    const scrollbarElements = document.querySelectorAll(".scrollbar-container");
    scrollbarElements.forEach((element) => {
      this._create(element);
    });
  }

  public update(element?: Element): void {
    if (element) {
      const scrollbar = this._scrollbars.get(element);
      if (scrollbar) scrollbar.update();
    } else {
      this._scrollbars.forEach((scrollbar) => scrollbar.update());
    }
  }
}

export const _scrollbarManager = new ScrollbarManager();
