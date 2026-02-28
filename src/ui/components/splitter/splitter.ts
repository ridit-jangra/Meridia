import { cn } from "../../../core/utils/cn";
import { h } from "../../../core/dom/h";
import {
  clamp,
  normalizeSizes,
  pixelDeltaToPercent,
  calcResizedPair,
  collapsePanel,
  expandPanel,
  resolveGutterDimension,
  panelSizeStyle,
  gutterSizeStyle,
  gutterTrackStyle,
} from "./splitter.helpers";

export type SplitterDirection = "horizontal" | "vertical";

export type SplitterPanel = {
  id: string;

  size?: number;
  minSize?: number;
  collapsible?: boolean;
  el: HTMLElement;
};

export type SplitterOpts = {
  direction?: SplitterDirection;
  panels: SplitterPanel[];
  gutterSize?: number;
  class?: string;
  onResize?: (sizes: { id: string; size: number }[]) => void;
  onResizeEnd?: (sizes: { id: string; size: number }[]) => void;
  onCollapse?: (id: string, collapsed: boolean) => void;
};

type PanelState = SplitterPanel & {
  paneEl: HTMLElement;
  currentSize: number;
};

export function Splitter(opts: SplitterOpts) {
  const dir = opts.direction ?? "horizontal";
  const isHorizontal = dir === "horizontal";
  const gutterSize = opts.gutterSize ?? 4;
  const { lineSize, hoverSize, hitSize } = resolveGutterDimension(gutterSize);

  const rawSizes = opts.panels.map((p) => p.size ?? 100 / opts.panels.length);
  const normSizes = normalizeSizes(rawSizes);

  const states: PanelState[] = opts.panels.map((p, i) => {
    const paneEl = h("div", {
      class: cn(
        "min-h-0 min-w-0 overflow-hidden rounded-2xl",
        isHorizontal ? "h-full" : "w-full",
      ),
    });
    paneEl.appendChild(p.el);
    return { ...p, paneEl, currentSize: normSizes[i] };
  });

  const getContainerSize = () =>
    isHorizontal ? container.clientWidth : container.clientHeight;

  const applySize = (state: PanelState) => {
    state.paneEl.setAttribute("style", panelSizeStyle(dir, state.currentSize));
  };

  const applySizes = () => states.forEach(applySize);

  const emitSizes = (cb?: (sizes: { id: string; size: number }[]) => void) => {
    cb?.(states.map((s) => ({ id: s.id, size: s.currentSize })));
  };

  const children: HTMLElement[] = [];
  const gutterCleanups: (() => void)[] = [];

  states.forEach((state, i) => {
    children.push(state.paneEl);

    if (i >= states.length - 1) return;

    const indexA = i;
    const indexB = i + 1;
    const isCollapsiblePair =
      !!states[indexA].collapsible || !!states[indexB].collapsible;

    const gutterInner = h("div", {
      class: cn(
        "absolute transition-all duration-150",
        // "bg-split-handle-foreground",
        "hover:bg-split-handle-hover-foreground",
        "active:bg-split-handle-active-foreground",
      ),
      style: gutterTrackStyle(dir, lineSize),
    });

    const gutter = h("div", {
      class: cn(
        "relative flex-shrink-0 select-none z-10",
        isHorizontal ? "h-full cursor-col-resize" : "w-full cursor-row-resize",
      ),
      style: gutterSizeStyle(dir, hitSize),
    });
    gutter.appendChild(gutterInner);

    const onGutterEnter = () => {
      if (isHorizontal) gutterInner.style.width = `${hoverSize}px`;
      else gutterInner.style.height = `${hoverSize}px`;
    };
    const onGutterLeave = () => {
      if (isHorizontal) gutterInner.style.width = `${lineSize}px`;
      else gutterInner.style.height = `${lineSize}px`;
    };
    gutter.addEventListener("mouseenter", onGutterEnter);
    gutter.addEventListener("mouseleave", onGutterLeave);

    const onDblClick = () => {
      if (!isCollapsiblePair) return;

      const a = states[indexA];
      const b = states[indexB];
      const target = a.collapsible ? a : b;
      const targetIdx = target === a ? indexA : indexB;
      const neighborIdx = target === a ? indexB : indexA;

      if (target.currentSize < 2) {
        const { sizes } = expandPanel({
          sizes: states.map((s) => s.currentSize),
          index: targetIdx,
          restoreSize: target.size ?? 20,
          neighborMinSize: states[neighborIdx].minSize ?? 5,
          neighborIndex: neighborIdx,
        });
        sizes.forEach((sz, idx) => (states[idx].currentSize = sz));
        opts.onCollapse?.(target.id, false);
      } else {
        const { sizes } = collapsePanel({
          sizes: states.map((s) => s.currentSize),
          index: targetIdx,
          neighborIndex: neighborIdx,
        });
        sizes.forEach((sz, idx) => (states[idx].currentSize = sz));
        opts.onCollapse?.(target.id, true);
      }

      applySizes();
      emitSizes(opts.onResizeEnd);
    };
    gutter.addEventListener("dblclick", onDblClick);

    let dragging = false;
    let startPos = 0;
    let startSizeA = 0;
    let startSizeB = 0;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      dragging = true;
      startPos = isHorizontal ? e.clientX : e.clientY;
      startSizeA = states[indexA].currentSize;
      startSizeB = states[indexB].currentSize;
      document.body.style.userSelect = "none";
      document.body.style.cursor = isHorizontal ? "col-resize" : "row-resize";
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging) return;

      const containerPx = getContainerSize();
      const rawDeltaPx = isHorizontal
        ? e.clientX - startPos
        : e.clientY - startPos;
      const deltaPct = pixelDeltaToPercent(rawDeltaPx, containerPx);

      const minAPct = ((states[indexA].minSize ?? 0) / containerPx) * 100;
      const minBPct = ((states[indexB].minSize ?? 0) / containerPx) * 100;

      const { newSizeA, newSizeB, collapsedA, collapsedB } = calcResizedPair(
        deltaPct,
        {
          sizeA: startSizeA,
          sizeB: startSizeB,
          minA: minAPct,
          minB: minBPct,
          collapsibleA: !!states[indexA].collapsible,
          collapsibleB: !!states[indexB].collapsible,
        },
      );

      states[indexA].currentSize = newSizeA;
      states[indexB].currentSize = newSizeB;
      applySizes();
      emitSizes(opts.onResize);

      if (collapsedA) opts.onCollapse?.(states[indexA].id, true);
      if (collapsedB) opts.onCollapse?.(states[indexB].id, true);
    };

    const onMouseUp = () => {
      if (!dragging) return;
      dragging = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";

      if (states[indexA].collapsible && states[indexA].currentSize < 2)
        opts.onCollapse?.(states[indexA].id, true);
      if (states[indexB].collapsible && states[indexB].currentSize < 2)
        opts.onCollapse?.(states[indexB].id, true);

      emitSizes(opts.onResizeEnd);
    };

    gutter.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    gutterCleanups.push(() => {
      gutter.removeEventListener("mouseenter", onGutterEnter);
      gutter.removeEventListener("mouseleave", onGutterLeave);
      gutter.removeEventListener("dblclick", onDblClick);
      gutter.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    });

    children.push(gutter);
  });

  const container = h(
    "div",
    {
      class: cn(
        "flex min-h-0 min-w-0 h-full w-full overflow-hidden",
        isHorizontal ? "flex-row" : "flex-col",
        opts.class,
      ),
    },
    ...children,
  );

  applySizes();

  return {
    el: container,

    getSizes(): { id: string; size: number }[] {
      return states.map((s) => ({ id: s.id, size: s.currentSize }));
    },

    setSizes(sizes: { id: string; size: number }[]) {
      for (const { id, size } of sizes) {
        const s = states.find((st) => st.id === id);
        if (s) s.currentSize = clamp(size, 0, 100);
      }
      const norm = normalizeSizes(states.map((s) => s.currentSize));
      states.forEach((s, i) => (s.currentSize = norm[i]));
      applySizes();
    },

    collapse(id: string) {
      const idx = states.findIndex((s) => s.id === id);
      if (idx === -1 || states[idx].currentSize === 0) return;
      const neighborIndex = idx > 0 ? idx - 1 : idx + 1;
      const { sizes } = collapsePanel({
        sizes: states.map((s) => s.currentSize),
        index: idx,
        neighborIndex,
      });
      sizes.forEach((sz, i) => (states[i].currentSize = sz));
      applySizes();
      opts.onCollapse?.(id, true);
      emitSizes(opts.onResizeEnd);
    },

    expand(id: string) {
      const idx = states.findIndex((s) => s.id === id);
      if (idx === -1 || states[idx].currentSize > 0) return;
      const neighborIndex = idx > 0 ? idx - 1 : idx + 1;
      const { sizes } = expandPanel({
        sizes: states.map((s) => s.currentSize),
        index: idx,
        restoreSize: states[idx].size ?? 20,
        neighborMinSize: states[neighborIndex]?.minSize ?? 5,
        neighborIndex,
      });
      sizes.forEach((sz, i) => (states[i].currentSize = sz));
      applySizes();
      opts.onCollapse?.(id, false);
      emitSizes(opts.onResizeEnd);
    },

    destroy() {
      gutterCleanups.forEach((fn) => fn());
    },
  };
}
