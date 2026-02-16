import { cn } from "../../core/utils/cn";
import { h } from "../../core/dom/h";

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function ScrollArea(opts?: {
  class?: string;
  innerClass?: string;
  children?: Array<HTMLElement | string>;
  scrollbarClass?: string;
  dir?: "vertical" | "horizontal";
}) {
  const dir = opts?.dir ?? "vertical";
  const isHorizontal = dir === "horizontal";

  const viewport = h(
    "div",
    {
      class: cn(
        "min-h-0 min-w-0 h-full",
        "scrollbar-hide",
        isHorizontal
          ? "overflow-x-auto overflow-y-hidden"
          : "overflow-y-auto overflow-x-hidden",
        opts?.class,
      ),
    },
    h(
      "div",
      {
        class: cn(
          "min-h-0 min-w-0",
          isHorizontal ? "h-full" : "",
          opts?.innerClass,
        ),
      },
      ...(opts?.children ?? []),
    ),
  );

  const inner = viewport.firstElementChild as HTMLDivElement;

  const track = h("div", {
    class: cn(
      isHorizontal
        ? "overlay-scrollbar-track-horizontal"
        : "overlay-scrollbar-track",
      opts?.scrollbarClass,
    ),
  });

  const thumb = h("div", {
    class: isHorizontal
      ? "overlay-scrollbar-thumb-horizontal"
      : "overlay-scrollbar-thumb",
  });

  track.appendChild(thumb);

  const el = h(
    "div",
    { class: "overlay-scrollbar-root h-full relative" },
    viewport,
    track,
  );

  let dragging = false;
  let dragStart = 0;
  let dragStartScroll = 0;

  const metrics = () => {
    if (isHorizontal) {
      const vw = viewport.clientWidth;
      const sw = viewport.scrollWidth;
      const sl = viewport.scrollLeft;
      const tw = track.clientWidth;

      const maxScroll = Math.max(1, sw - vw);
      const minThumb = 24;

      const thumbW = clamp((vw / sw) * tw, minThumb, tw);
      const maxThumbLeft = Math.max(0, tw - thumbW);
      const thumbLeft = (sl / maxScroll) * maxThumbLeft;

      return {
        viewSize: vw,
        scrollSize: sw,
        scrollPos: sl,
        trackSize: tw,
        maxScroll,
        thumbSize: thumbW,
        maxThumbPos: maxThumbLeft,
        thumbPos: thumbLeft,
      };
    } else {
      const vh = viewport.clientHeight;
      const sh = viewport.scrollHeight;
      const st = viewport.scrollTop;
      const th = track.clientHeight;

      const maxScroll = Math.max(1, sh - vh);
      const minThumb = 24;

      const thumbH = clamp((vh / sh) * th, minThumb, th);
      const maxThumbTop = Math.max(0, th - thumbH);
      const thumbTop = (st / maxScroll) * maxThumbTop;

      return {
        viewSize: vh,
        scrollSize: sh,
        scrollPos: st,
        trackSize: th,
        maxScroll,
        thumbSize: thumbH,
        maxThumbPos: maxThumbTop,
        thumbPos: thumbTop,
      };
    }
  };

  const render = () => {
    const { scrollSize, viewSize, thumbSize, thumbPos } = metrics();

    // Hide track if content doesn't need scrolling
    if (scrollSize <= viewSize + 1) {
      track.style.display = "none";
      return;
    }

    track.style.display = "block";

    if (isHorizontal) {
      thumb.style.width = `${thumbSize}px`;
      thumb.style.height = "";
      thumb.style.transform = `translateX(${thumbPos}px)`;
    } else {
      thumb.style.height = `${thumbSize}px`;
      thumb.style.width = "";
      thumb.style.transform = `translateY(${thumbPos}px)`;
    }
  };

  const onScroll = () => render();

  // Handle horizontal scrolling with mouse wheel
  const onWheel = (e: WheelEvent) => {
    if (!isHorizontal) return;

    const { scrollSize, viewSize } = metrics();

    // Only handle if content needs scrolling
    if (scrollSize <= viewSize + 1) return;

    // Prevent default vertical scroll
    e.preventDefault();

    // Convert vertical wheel delta to horizontal scroll
    // deltaY is the vertical scroll amount
    const delta = e.deltaY || e.deltaX;
    viewport.scrollLeft += delta;
  };

  const onThumbDown = (e: PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragging = true;
    dragStart = isHorizontal ? e.clientX : e.clientY;
    dragStartScroll = isHorizontal ? viewport.scrollLeft : viewport.scrollTop;
    thumb.setPointerCapture(e.pointerId);
    document.body.style.userSelect = "none";
  };

  const onMove = (e: PointerEvent) => {
    if (!dragging) return;

    const { maxScroll, trackSize } = metrics();
    const delta = (isHorizontal ? e.clientX : e.clientY) - dragStart;

    const thumbSize = isHorizontal
      ? thumb.getBoundingClientRect().width
      : thumb.getBoundingClientRect().height;
    const travel = Math.max(1, trackSize - thumbSize);

    const scrollDelta = (delta / Math.max(1, travel)) * maxScroll;

    if (isHorizontal) {
      viewport.scrollLeft = dragStartScroll + scrollDelta;
    } else {
      viewport.scrollTop = dragStartScroll + scrollDelta;
    }

    render();
  };

  const onUp = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    try {
      thumb.releasePointerCapture(e.pointerId);
    } catch {}
    document.body.style.userSelect = "";
  };

  const onTrackDown = (e: MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t === thumb) return;

    e.preventDefault();
    e.stopPropagation();

    const r = track.getBoundingClientRect();
    const { maxScroll, maxThumbPos, thumbSize } = metrics();

    const clickPos = isHorizontal ? e.clientX - r.left : e.clientY - r.top;
    const targetThumbPos = clamp(clickPos - thumbSize / 2, 0, maxThumbPos);
    const ratio = maxThumbPos === 0 ? 0 : targetThumbPos / maxThumbPos;

    if (isHorizontal) {
      viewport.scrollLeft = ratio * maxScroll;
    } else {
      viewport.scrollTop = ratio * maxScroll;
    }

    render();
  };

  viewport.addEventListener("scroll", onScroll, { passive: true });
  thumb.addEventListener("pointerdown", onThumbDown);
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerup", onUp, { passive: true });
  track.addEventListener("mousedown", onTrackDown);

  // Add wheel event listener for horizontal scrolling
  if (isHorizontal) {
    viewport.addEventListener("wheel", onWheel, { passive: false });
  }

  const ro = new ResizeObserver(() => render());
  ro.observe(viewport);
  ro.observe(inner);

  requestAnimationFrame(render);

  return {
    el,
    viewport,
    inner,
    destroy() {
      ro.disconnect();
      viewport.removeEventListener("scroll", onScroll);
      thumb.removeEventListener("pointerdown", onThumbDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      track.removeEventListener("mousedown", onTrackDown);
      if (isHorizontal) {
        viewport.removeEventListener("wheel", onWheel);
      }
      el.remove();
    },
  };
}
