export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function normalizeSizes(sizes: number[]): number[] {
  if (sizes.length === 0) return [];
  const total = sizes.reduce((a, b) => a + b, 0);
  if (total === 0) return sizes.map(() => 100 / sizes.length);
  return sizes.map((s) => (s / total) * 100);
}

export function pixelDeltaToPercent(
  deltaPx: number,
  containerPx: number,
): number {
  if (containerPx === 0) return 0;
  return (deltaPx / containerPx) * 100;
}

export function percentToPx(pct: number, containerPx: number): number {
  return (pct / 100) * containerPx;
}

export type ResizePair = {
  sizeA: number;
  sizeB: number;
  collapsibleA: boolean;
  collapsibleB: boolean;
  snapThreshold?: number;
};

export type ResizePairResult = {
  newSizeA: number;
  newSizeB: number;
  collapsedA: boolean;
  collapsedB: boolean;
};

export function calcResizedPair(
  deltaPct: number,
  pair: ResizePair,
): ResizePairResult {
  const { sizeA, sizeB, collapsibleA, collapsibleB } = pair;
  const snap = pair.snapThreshold ?? 3;
  const totalAvail = sizeA + sizeB;

  let newA = clamp(sizeA + deltaPct, 0, totalAvail);
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

export type CollapseOpts = {
  sizes: number[];
  index: number;
  neighborIndex?: number;
};

export type CollapseResult = {
  sizes: number[];
  neighborIndex: number;
};

export function collapsePanel(opts: CollapseOpts): CollapseResult {
  const { sizes, index } = opts;
  const neighborIndex =
    opts.neighborIndex ?? (index > 0 ? index - 1 : index + 1);

  if (neighborIndex < 0 || neighborIndex >= sizes.length) {
    return { sizes: [...sizes], neighborIndex: index };
  }

  const next = [...sizes];
  next[neighborIndex] += next[index];
  next[index] = 0;

  return { sizes: next, neighborIndex };
}

export type ExpandOpts = {
  sizes: number[];
  index: number;
  restoreSize: number;
  neighborIndex?: number;
};

export function expandPanel(opts: ExpandOpts): CollapseResult {
  const { sizes, index, restoreSize } = opts;
  const neighborIndex =
    opts.neighborIndex ?? (index > 0 ? index - 1 : index + 1);

  if (neighborIndex < 0 || neighborIndex >= sizes.length) {
    return { sizes: [...sizes], neighborIndex: index };
  }

  const next = [...sizes];
  const actual = Math.min(restoreSize, next[neighborIndex]);

  next[index] = actual;
  next[neighborIndex] -= actual;

  return { sizes: next, neighborIndex };
}

export type GutterDimension = {
  lineSize: number;
  hoverSize: number;
  hitSize: number;
};

export function resolveGutterDimension(gutterSize: number): GutterDimension {
  if (gutterSize <= 2) {
    return { lineSize: gutterSize, hoverSize: gutterSize, hitSize: gutterSize };
  }
  return {
    lineSize: 2,
    hoverSize: 5,
    hitSize: gutterSize,
  };
}

export function panelSizeStyle(
  direction: "horizontal" | "vertical",
  sizePct: number,
): string {
  if (direction === "horizontal") {
    return `width:${sizePct}%; height:100%; flex-shrink:1;`;
  }
  return `height:${sizePct}%; width:100%; flex-shrink:1;`;
}

export function gutterSizeStyle(
  direction: "horizontal" | "vertical",
  hitSize: number,
): string {
  return direction === "horizontal"
    ? `width:${hitSize}px;`
    : `height:${hitSize}px;`;
}

export function gutterTrackStyle(
  direction: "horizontal" | "vertical",
  lineSize: number,
): string {
  if (direction === "horizontal") {
    return `width:${lineSize}px; height:100%; left:50%; transform:translateX(-50%);`;
  }
  return `height:${lineSize}px; width:100%; top:50%; transform:translateY(-50%);`;
}
