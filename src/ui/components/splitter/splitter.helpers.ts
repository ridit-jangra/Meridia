/**
 * splitter.helpers.ts
 * Pure utility functions for the Splitter component.
 * No DOM dependencies — all functions are stateless and easily testable.
 */

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------

/** Clamp `v` between `min` and `max` (inclusive). */
export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Normalize an array of sizes so they sum to exactly 100.
 * If the total is 0 (e.g. all panels collapsed), returns equal shares.
 */
export function normalizeSizes(sizes: number[]): number[] {
  if (sizes.length === 0) return [];
  const total = sizes.reduce((a, b) => a + b, 0);
  if (total === 0) return sizes.map(() => 100 / sizes.length);
  return sizes.map((s) => (s / total) * 100);
}

/**
 * Given a drag delta in pixels and the total container size in pixels,
 * return the equivalent delta as a percentage of the container.
 */
export function pixelDeltaToPercent(
  deltaPx: number,
  containerPx: number,
): number {
  if (containerPx === 0) return 0;
  return (deltaPx / containerPx) * 100;
}

/**
 * Convert a percentage size to pixels given the container pixel size.
 */
export function percentToPx(pct: number, containerPx: number): number {
  return (pct / 100) * containerPx;
}

// ---------------------------------------------------------------------------
// Resize calculation
// ---------------------------------------------------------------------------

export type ResizePair = {
  sizeA: number; // current percentage of panel A (left / top)
  sizeB: number; // current percentage of panel B (right / bottom)
  minA: number; // minimum percentage for A
  minB: number; // minimum percentage for B
  collapsibleA: boolean;
  collapsibleB: boolean;
  /** Snap-to-zero threshold (percentage). Defaults to 3. */
  snapThreshold?: number;
};

export type ResizePairResult = {
  newSizeA: number;
  newSizeB: number;
  /** True when A snapped to 0 (collapsed). */
  collapsedA: boolean;
  /** True when B snapped to 0 (collapsed). */
  collapsedB: boolean;
};

/**
 * Given a drag delta (in percent of container) applied to a pair of adjacent
 * panels, return the new clamped / snapped sizes.
 *
 * Rules applied in order:
 *  1. Clamp each panel to its minSize.
 *  2. If either panel is collapsible and falls below `snapThreshold`, snap to 0.
 */
export function calcResizedPair(
  deltaPct: number,
  pair: ResizePair,
): ResizePairResult {
  const { sizeA, sizeB, minA, minB, collapsibleA, collapsibleB } = pair;
  const snap = pair.snapThreshold ?? 3;
  const totalAvail = sizeA + sizeB;

  let newA = clamp(sizeA + deltaPct, minA, totalAvail - minB);
  let newB = totalAvail - newA;

  let collapsedA = false;
  let collapsedB = false;

  if (collapsibleA && newA < snap) {
    newA = 0;
    newB = totalAvail;
    collapsedA = true;
  } else if (collapsibleB && newB < snap) {
    newB = 0;
    newA = totalAvail;
    collapsedB = true;
  }

  return { newSizeA: newA, newSizeB: newB, collapsedA, collapsedB };
}

// ---------------------------------------------------------------------------
// Collapse / expand helpers
// ---------------------------------------------------------------------------

export type CollapseOpts = {
  sizes: number[];
  /** Index of the panel to collapse. */
  index: number;
  /** Index of the panel that absorbs the freed space. Defaults to the
   *  nearest neighbor (prefers left/top, falls back to right/bottom). */
  neighborIndex?: number;
};

export type CollapseResult = {
  sizes: number[];
  /** The neighbor that absorbed the space. */
  neighborIndex: number;
};

/**
 * Collapse panel at `index` to 0% and give its space to the neighbor.
 * Returns a new sizes array (original is not mutated).
 */
export function collapsePanel(opts: CollapseOpts): CollapseResult {
  const { sizes, index } = opts;
  const neighborIndex =
    opts.neighborIndex ?? (index > 0 ? index - 1 : index + 1);

  if (neighborIndex < 0 || neighborIndex >= sizes.length) {
    // No valid neighbor — return unchanged
    return { sizes: [...sizes], neighborIndex: index };
  }

  const next = [...sizes];
  next[neighborIndex] += next[index];
  next[index] = 0;

  return { sizes: next, neighborIndex };
}

export type ExpandOpts = {
  sizes: number[];
  /** Index of the panel to expand. */
  index: number;
  /** The size it should be restored to (percentage). */
  restoreSize: number;
  /** Minimum size that the neighbor must keep (percentage). */
  neighborMinSize?: number;
  /** Which neighbor gives up space. Defaults to nearest. */
  neighborIndex?: number;
};

/**
 * Expand a previously-collapsed panel back to `restoreSize`, taking the space
 * from a neighbor. Returns a new sizes array (original is not mutated).
 */
export function expandPanel(opts: ExpandOpts): CollapseResult {
  const { sizes, index, restoreSize } = opts;
  const neighborIndex =
    opts.neighborIndex ?? (index > 0 ? index - 1 : index + 1);
  const neighborMin = opts.neighborMinSize ?? 5;

  if (neighborIndex < 0 || neighborIndex >= sizes.length) {
    return { sizes: [...sizes], neighborIndex: index };
  }

  const next = [...sizes];
  const maxRestore = Math.max(0, next[neighborIndex] - neighborMin);
  const actual = Math.min(restoreSize, maxRestore);

  next[index] = actual;
  next[neighborIndex] -= actual;

  return { sizes: next, neighborIndex };
}

// ---------------------------------------------------------------------------
// Gutter sizing helpers
// ---------------------------------------------------------------------------

export type GutterDimension = {
  /** Base visual "line" size in px. */
  lineSize: number;
  /** Hover expanded size in px. */
  hoverSize: number;
  /** Hit-area / interactive size in px (always >= lineSize). */
  hitSize: number;
};

/**
 * Given a requested gutter thickness, return the three distinct sizes used
 * by the gutter element and its inner track element.
 *
 * A thin (≤ 2 px) gutter stays thin even on hover so it doesn't feel intrusive
 * in dense layouts. A thicker gutter expands on hover for easier grabbing.
 */
export function resolveGutterDimension(gutterSize: number): GutterDimension {
  if (gutterSize <= 2) {
    return { lineSize: gutterSize, hoverSize: gutterSize, hitSize: gutterSize };
  }
  return {
    lineSize: 1, // rendered line is always 1 px
    hoverSize: 5, // expands to 5 px on hover
    hitSize: gutterSize, // outer element keeps the full hit area
  };
}

// ---------------------------------------------------------------------------
// CSS size string helpers
// ---------------------------------------------------------------------------

/**
 * Return an inline style string for a panel element based on direction
 * and current percentage.
 */
export function panelSizeStyle(
  direction: "horizontal" | "vertical",
  sizePct: number,
): string {
  if (direction === "horizontal") {
    return `width:${sizePct}%; height:100%; flex-shrink:0;`;
  }
  return `height:${sizePct}%; width:100%; flex-shrink:0;`;
}

/**
 * Return an inline style string for the outer gutter element.
 */
export function gutterSizeStyle(
  direction: "horizontal" | "vertical",
  hitSize: number,
): string {
  return direction === "horizontal"
    ? `width:${hitSize}px;`
    : `height:${hitSize}px;`;
}

/**
 * Return an inline style string for the inner gutter track line.
 */
export function gutterTrackStyle(
  direction: "horizontal" | "vertical",
  lineSize: number,
): string {
  if (direction === "horizontal") {
    return (
      `width:${lineSize}px; height:100%; ` +
      `left:50%; transform:translateX(-50%);`
    );
  }
  return (
    `height:${lineSize}px; width:100%; ` +
    `top:50%; transform:translateY(-50%);`
  );
}
