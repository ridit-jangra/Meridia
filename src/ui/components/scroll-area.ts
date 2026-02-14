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
}) {
  const viewport = h(
    "div",
    {
      class: cn("min-h-0 min-w-0 overflow-auto", "scrollbar-hide", opts?.class),
    },
    h(
      "div",
      { class: cn("min-h-0 min-w-0", opts?.innerClass) },
      ...(opts?.children ?? []),
    ),
  );

  const inner = viewport.firstElementChild as HTMLDivElement;

  const track = h("div", {
    class: cn("overlay-scrollbar-track", opts?.scrollbarClass),
  });

  const thumb = h("div", { class: "overlay-scrollbar-thumb" });

  track.appendChild(thumb);

  const el = h("div", { class: "overlay-scrollbar-root" }, viewport, track);

  let dragging = false;
  let dragStartY = 0;
  let dragStartScrollTop = 0;

  const metrics = () => {
    const vh = viewport.clientHeight;
    const sh = viewport.scrollHeight;
    const st = viewport.scrollTop;
    const th = track.clientHeight;

    const maxScroll = Math.max(1, sh - vh);
    const minThumb = 24;

    const thumbH = clamp((vh / sh) * th, minThumb, th);
    const maxThumbTop = Math.max(0, th - thumbH);
    const thumbTop = (st / maxScroll) * maxThumbTop;

    return { vh, sh, st, th, maxScroll, thumbH, maxThumbTop, thumbTop };
  };

  const render = () => {
    const { sh, vh, thumbH, thumbTop } = metrics();

    if (sh <= vh + 1) {
      track.style.display = "none";
      return;
    }

    track.style.display = "block";
    thumb.style.height = `${thumbH}px`;
    thumb.style.transform = `translateY(${thumbTop}px)`;
  };

  const onScroll = () => render();

  const onThumbDown = (e: PointerEvent) => {
    dragging = true;
    dragStartY = e.clientY;
    dragStartScrollTop = viewport.scrollTop;
    thumb.setPointerCapture(e.pointerId);
    document.body.style.userSelect = "none";
  };

  const onMove = (e: PointerEvent) => {
    if (!dragging) return;

    const { maxScroll, maxThumbTop, th } = metrics();
    const dy = e.clientY - dragStartY;

    const thumbH = thumb.getBoundingClientRect().height;
    const travel = Math.max(1, th - thumbH);

    const scrollDelta = (dy / Math.max(1, travel)) * maxScroll;
    viewport.scrollTop = dragStartScrollTop + scrollDelta;

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

    const r = track.getBoundingClientRect();
    const { maxScroll, maxThumbTop, thumbH } = metrics();

    const clickY = e.clientY - r.top;
    const targetThumbTop = clamp(clickY - thumbH / 2, 0, maxThumbTop);
    const ratio = maxThumbTop === 0 ? 0 : targetThumbTop / maxThumbTop;

    viewport.scrollTop = ratio * maxScroll;
    render();
  };

  viewport.addEventListener("scroll", onScroll);
  thumb.addEventListener("pointerdown", onThumbDown);
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerup", onUp, { passive: true });
  track.addEventListener("mousedown", onTrackDown);

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
      el.remove();
    },
  };
}
