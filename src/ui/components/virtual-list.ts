import { h } from "../../core/dom/h";
import { cn } from "../../core/utils/cn";

export type VirtualListOpts<T> = {
  items: T[];
  itemHeight: number;
  height?: number | string;
  class?: string;
  innerClass?: string;
  overscan?: number;
  key?: (item: T, index: number) => string;
  render: (item: T, index: number) => HTMLElement;
  onRangeChange?: (start: number, end: number) => void;
};

export function VirtualList<T>(opts: VirtualListOpts<T>) {
  const overscan = opts.overscan ?? 6;

  const viewport = h("div", {
    class: cn("min-h-0 min-w-0 overflow-auto relative", opts.class),
    style:
      typeof opts.height === "number"
        ? `height:${opts.height}px;`
        : opts.height
          ? `height:${opts.height};`
          : "",
  });

  const inner = h("div", { class: cn("relative w-full", opts.innerClass) });
  const spacer = h("div", { class: "w-full", style: "height:0px;" });
  const layer = h("div", {
    class: "absolute left-0 top-0 w-full will-change-transform",
  });

  inner.appendChild(spacer);
  inner.appendChild(layer);
  viewport.appendChild(inner);

  let items = opts.items;
  let start = 0;
  let end = 0;
  let raf = 0;
  const cache = new Map<string, HTMLElement>();

  const setSpacer = () => {
    spacer.style.height = `${items.length * opts.itemHeight}px`;
  };

  const clamp = (v: number, a: number, b: number) =>
    Math.max(a, Math.min(b, v));

  const calcRange = () => {
    const top = viewport.scrollTop;
    const viewH = viewport.clientHeight;

    const first = Math.floor(top / opts.itemHeight);
    const visible = Math.ceil(viewH / opts.itemHeight);

    const s = clamp(first - overscan, 0, Math.max(0, items.length - 1));
    const e = clamp(first + visible + overscan, 0, items.length);

    return { s, e };
  };

  const renderRange = (s: number, e: number) => {
    if (s === start && e === end) return;
    start = s;
    end = e;

    layer.style.transform = `translateY(${start * opts.itemHeight}px)`;

    const newKeys = new Set<string>();
    const fragment = document.createDocumentFragment();

    for (let i = start; i < end; i++) {
      const key = opts.key ? opts.key(items[i], i) : String(i);
      newKeys.add(key);

      let row = cache.get(key);

      const shouldCache = !(items[i] as any).isFolder === false;

      if (!row || !shouldCache) {
        row = opts.render(items[i], i);
        (row.style as any).height = `${opts.itemHeight}px`;
        if (shouldCache) {
          cache.set(key, row);
        }
      }
      fragment.appendChild(row);
    }

    Array.from(cache.keys()).forEach((key) => {
      if (!newKeys.has(key)) {
        const el = cache.get(key);
        if (el && el.parentNode) {
          el.remove();
        }
        cache.delete(key);
      }
    });

    layer.innerHTML = "";
    layer.appendChild(fragment);

    opts.onRangeChange?.(start, end);
  };

  const tick = () => {
    raf = 0;
    const { s, e } = calcRange();
    renderRange(s, e);
  };

  const schedule = () => {
    if (raf) return;
    raf = window.requestAnimationFrame(tick);
  };

  const onScroll = () => schedule();
  const onResize = () => schedule();

  viewport.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize);

  setSpacer();
  schedule();

  return {
    el: viewport,
    viewport,
    inner,
    setItems(next: T[]) {
      items = next;
      cache.clear();
      setSpacer();
      start = -1;
      end = -1;
      schedule();
    },
    updateItem(index: number) {
      const key = opts.key ? opts.key(items[index], index) : String(index);
      cache.delete(key);

      if (index >= start && index < end) {
        const row = opts.render(items[index], index);
        (row.style as any).height = `${opts.itemHeight}px`;
        cache.set(key, row);

        const children = Array.from(layer.children);
        const elementIndex = index - start;
        if (children[elementIndex]) {
          layer.replaceChild(row, children[elementIndex]);
        }
      }
    },
    updateItems(next: T[]) {
      items = next;
      setSpacer();
      start = -1;
      end = -1;
      schedule();
    },
    refresh() {
      start = -1;
      end = -1;
      schedule();
    },
    invalidate(key: string) {
      cache.delete(key);
      start = -1;
      end = -1;
      schedule();
    },
    scrollToIndex(index: number, align: "start" | "center" | "end" = "start") {
      const hgt = viewport.clientHeight;
      const top = index * opts.itemHeight;
      const target =
        align === "start"
          ? top
          : align === "center"
            ? top - hgt / 2 + opts.itemHeight / 2
            : top - hgt + opts.itemHeight;

      viewport.scrollTop = Math.max(0, target);
      schedule();
    },
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      viewport.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      cache.clear();
      viewport.remove();
    },
  };
}
