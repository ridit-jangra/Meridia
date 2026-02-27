import { h } from "../../../core/dom/h";
import { cn } from "../../../core/utils/cn";

export type VirtualListOpts<T> = {
  items: T[];
  itemHeight: number;
  height?: number | string;
  class?: string;
  innerClass?: string;
  overscan?: number;
  cache?: boolean;
  key?: (item: T, index: number) => string;
  render: (item: T, index: number) => HTMLElement;
  onRangeChange?: (start: number, end: number) => void;
};

export function VirtualList<T>(opts: VirtualListOpts<T>) {
  const overscan = opts.overscan ?? 6;
  const shouldCache = opts.cache ?? false;

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

  const getKey = (item: T, index: number) =>
    opts.key ? opts.key(item, index) : String(index);

  const reconcile = (desired: HTMLElement[]) => {
    const byKey = new Map<string, HTMLElement>();
    Array.from(layer.children).forEach((n) => {
      const el = n as HTMLElement;
      const k = el.dataset.vkey;
      if (k) byKey.set(k, el);
    });

    let cur: ChildNode | null = layer.firstChild;

    for (let i = 0; i < desired.length; i++) {
      const want = desired[i];
      const k = want.dataset.vkey || "";

      if (cur && (cur as HTMLElement).dataset?.vkey === k) {
        byKey.delete(k);
        cur = cur.nextSibling;
        continue;
      }

      const existing = byKey.get(k);
      if (existing) {
        layer.insertBefore(existing, cur);
        byKey.delete(k);
        cur = existing.nextSibling;
        continue;
      }

      layer.insertBefore(want, cur);
      cur = want.nextSibling;
    }

    while (cur) {
      const next = cur.nextSibling;
      (cur as HTMLElement).remove();
      cur = next;
    }

    byKey.forEach((el) => el.remove());
  };

  const renderRange = (s: number, e: number) => {
    if (s === start && e === end) return;
    start = s;
    end = e;

    layer.style.transform = `translateY(${start * opts.itemHeight}px)`;

    const nodes: HTMLElement[] = [];
    const newKeys = new Set<string>();

    for (let i = start; i < end; i++) {
      const key = getKey(items[i], i);
      newKeys.add(key);

      let row = shouldCache ? cache.get(key) : undefined;

      if (!row) {
        row = opts.render(items[i], i);
        row.style.height = `${opts.itemHeight}px`;
        row.dataset.vkey = key;
        if (shouldCache) cache.set(key, row);
      } else {
        row.dataset.vkey = key;
      }

      nodes.push(row);
    }

    if (shouldCache) {
      Array.from(cache.keys()).forEach((k) => {
        if (!newKeys.has(k)) cache.delete(k);
      });
    }

    reconcile(nodes);

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
    layer, // <-- exposed so callers can query live DOM nodes directly
    setItems(next: T[]) {
      items = next;
      setSpacer();
      start = -1;
      end = -1;
      cache.clear();
      schedule();
    },
    updateItems(next: T[]) {
      items = next;
      setSpacer();
      start = -1;
      end = -1;
      cache.clear();
      schedule();
    },
    refresh() {
      start = -1;
      end = -1;
      cache.clear();
      schedule();
    },
    invalidate(key: string) {
      cache.delete(key);
      start = -1;
      end = -1;
      schedule();
    },
    updateItem(index: number) {
      const key = getKey(items[index], index);
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
