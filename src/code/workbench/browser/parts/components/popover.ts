import { h } from "../../../contrib/core/dom/h";
import { cn } from "../../../contrib/core/utils/cn";

export type TPopoverPlacement = "top" | "bottom" | "left" | "right";
export type TPopoverAlign = "start" | "center" | "end";
export type TPopoverTrigger = "click" | "hover" | "manual";

export type TPopoverOptions = {
  open?: boolean;
  trigger?: TPopoverTrigger;
  placement?: TPopoverPlacement;
  align?: TPopoverAlign;
  offset?: number;
  padding?: number;
  closeOnOutsideClick?: boolean;
  closeOnEsc?: boolean;
  trapFocus?: boolean;
  forcePlacement?: boolean;
  className?: string;
  contentClassName?: string;
  onOpenChange?: (open: boolean) => void;
};

export type TPopover = {
  el: HTMLElement;
  contentEl: HTMLElement;
  open: () => void;
  close: () => void;
  toggle: () => void;
  isOpen: () => boolean;
  update: () => void;
  dispose: () => void;
};

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

const getScrollParents = (el: HTMLElement) => {
  const parents: (HTMLElement | Window)[] = [];
  let p: HTMLElement | null = el.parentElement;

  while (p) {
    const s = getComputedStyle(p);
    const overflowY = s.overflowY;
    const overflowX = s.overflowX;
    const canScrollY = overflowY === "auto" || overflowY === "scroll";
    const canScrollX = overflowX === "auto" || overflowX === "scroll";
    if (canScrollY || canScrollX) parents.push(p);
    p = p.parentElement;
  }

  parents.push(window);
  return parents;
};

const setAria = (anchor: HTMLElement, content: HTMLElement, open: boolean) => {
  if (!content.id)
    content.id = `popover-${Math.random().toString(16).slice(2)}`;
  anchor.setAttribute("aria-haspopup", "dialog");
  anchor.setAttribute("aria-expanded", open ? "true" : "false");
  anchor.setAttribute("aria-controls", content.id);
};

const nextFocusable = (root: HTMLElement) => {
  const sel =
    'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';
  const els = Array.from(root.querySelectorAll<HTMLElement>(sel)).filter(
    (x) => x.offsetParent !== null || x === document.activeElement,
  );
  return els;
};

const computePosition = (
  anchorRect: DOMRect,
  popRect: DOMRect,
  placement: TPopoverPlacement,
  align: TPopoverAlign,
  offset: number,
) => {
  let top = 0;
  let left = 0;

  const ax = anchorRect.left;
  const ay = anchorRect.top;
  const aw = anchorRect.width;
  const ah = anchorRect.height;

  const pw = popRect.width;
  const ph = popRect.height;

  if (placement === "bottom") top = ay + ah + offset;
  if (placement === "top") top = ay - ph - offset;
  if (placement === "left") left = ax - pw - offset;
  if (placement === "right") left = ax + aw + offset;

  if (placement === "top" || placement === "bottom") {
    if (align === "start") left = ax;
    if (align === "center") left = ax + aw / 2 - pw / 2;
    if (align === "end") left = ax + aw - pw;
  } else {
    if (align === "start") top = ay;
    if (align === "center") top = ay + ah / 2 - ph / 2;
    if (align === "end") top = ay + ah - ph;
  }

  return { top, left };
};

const pickPlacement = (
  anchorRect: DOMRect,
  popRect: DOMRect,
  placement: TPopoverPlacement,
  offset: number,
  padding: number,
) => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const fits = (pl: TPopoverPlacement) => {
    const pos = computePosition(anchorRect, popRect, pl, "center", offset);
    const left = pos.left;
    const top = pos.top;
    const right = left + popRect.width;
    const bottom = top + popRect.height;
    return (
      left >= padding &&
      top >= padding &&
      right <= vw - padding &&
      bottom <= vh - padding
    );
  };

  if (fits(placement)) return placement;

  const order: TPopoverPlacement[] =
    placement === "bottom"
      ? ["bottom", "top", "right", "left"]
      : placement === "top"
        ? ["top", "bottom", "right", "left"]
        : placement === "right"
          ? ["right", "left", "bottom", "top"]
          : ["left", "right", "bottom", "top"];

  for (const pl of order) if (fits(pl)) return pl;
  return placement;
};

export function Popover(
  anchor: HTMLElement,
  content: HTMLElement,
  opts: TPopoverOptions = {},
): TPopover {
  const o: Required<TPopoverOptions> = {
    open: opts.open ?? false,
    trigger: opts.trigger ?? "click",
    placement: opts.placement ?? "bottom",
    align: opts.align ?? "start",
    offset: opts.offset ?? 8,
    padding: opts.padding ?? 8,
    closeOnOutsideClick: opts.closeOnOutsideClick ?? true,
    closeOnEsc: opts.closeOnEsc ?? true,
    trapFocus: opts.trapFocus ?? false,
    forcePlacement: opts.forcePlacement ?? false,
    className: opts.className ?? "",
    contentClassName: opts.contentClassName ?? "",
    onOpenChange: opts.onOpenChange ?? (() => {}),
  };

  const root = h("div");
  root.className = cn(
    "bg-popover-background fixed left-0 top-0 z-50",
    o.className,
  );
  root.style.display = "none";

  const contentWrap = h("div");
  contentWrap.className = cn(
    "popover-shadow bg-popover-content-background border border-popover-border p-1.5 rounded-[7px] text-popover-content-foreground text-sm",
    o.contentClassName,
  );

  contentWrap.setAttribute("role", "dialog");
  contentWrap.setAttribute("tabindex", "-1");

  contentWrap.appendChild(content);
  root.appendChild(contentWrap);
  document.body.appendChild(root);

  let open = o.open;
  let scrollParents: (HTMLElement | Window)[] = [];
  let raf = 0;

  const onDocPointerDown = (e: PointerEvent) => {
    if (!open) return;
    const t = e.target as Node | null;
    if (!t) return;
    if (anchor.contains(t)) return;
    if (root.contains(t)) return;
    if (o.closeOnOutsideClick) api.close();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!open) return;
    if (o.closeOnEsc && e.key === "Escape") api.close();
    if (o.trapFocus && e.key === "Tab") {
      const focusables = nextFocusable(contentWrap);
      if (focusables.length === 0) {
        e.preventDefault();
        contentWrap.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (active === first || !contentWrap.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  };

  const scheduleUpdate = () => {
    if (!open) return;
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => api.update());
  };

  const attachScrollListeners = () => {
    scrollParents = getScrollParents(anchor);
    for (const p of scrollParents)
      (p as any).addEventListener?.("scroll", scheduleUpdate, {
        passive: true,
      });
    window.addEventListener("resize", scheduleUpdate, { passive: true });
  };

  const detachScrollListeners = () => {
    for (const p of scrollParents)
      (p as any).removeEventListener?.("scroll", scheduleUpdate);
    scrollParents = [];
    window.removeEventListener("resize", scheduleUpdate);
  };

  const onAnchorClick = (e: MouseEvent) => {
    if (o.trigger !== "click") return;
    e.preventDefault();
    api.toggle();
  };

  let hoverCloseTimer: number | null = null;

  const onAnchorEnter = () => {
    if (o.trigger !== "hover") return;
    if (hoverCloseTimer) window.clearTimeout(hoverCloseTimer);
    api.open();
  };

  const onAnchorLeave = () => {
    if (o.trigger !== "hover") return;
    if (hoverCloseTimer) window.clearTimeout(hoverCloseTimer);
    hoverCloseTimer = window.setTimeout(() => api.close(), 120);
  };

  const onPopoverEnter = () => {
    if (o.trigger !== "hover") return;
    if (hoverCloseTimer) window.clearTimeout(hoverCloseTimer);
  };

  const onPopoverLeave = () => {
    if (o.trigger !== "hover") return;
    if (hoverCloseTimer) window.clearTimeout(hoverCloseTimer);
    hoverCloseTimer = window.setTimeout(() => api.close(), 120);
  };

  const api: TPopover = {
    el: root,
    contentEl: contentWrap,
    open: () => {
      if (open) return;
      open = true;
      root.style.display = "block";
      setAria(anchor, contentWrap, true);
      attachScrollListeners();
      document.addEventListener("pointerdown", onDocPointerDown, true);
      document.addEventListener("keydown", onKeyDown, true);
      api.update();
      o.onOpenChange(true);
      if (o.trapFocus) contentWrap.focus();
    },
    close: () => {
      if (!open) return;
      open = false;
      root.style.display = "none";
      setAria(anchor, contentWrap, false);
      detachScrollListeners();
      document.removeEventListener("pointerdown", onDocPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
      o.onOpenChange(false);
    },
    toggle: () => (open ? api.close() : api.open()),
    isOpen: () => open,
    update: () => {
      if (!open) return;

      contentWrap.style.maxWidth = `${window.innerWidth - o.padding * 2}px`;
      contentWrap.style.maxHeight = `${window.innerHeight - o.padding * 2}px`;

      const ar = anchor.getBoundingClientRect();
      root.style.left = "0px";
      root.style.top = "0px";

      const pr0 = contentWrap.getBoundingClientRect();
      const pl = o.forcePlacement
        ? o.placement
        : pickPlacement(ar, pr0, o.placement, o.offset, o.padding);
      const pr = contentWrap.getBoundingClientRect();

      const pos = computePosition(ar, pr, pl, o.align, o.offset);

      const left = clamp(
        pos.left,
        o.padding,
        window.innerWidth - o.padding - pr.width,
      );
      const top = clamp(
        pos.top,
        o.padding,
        window.innerHeight - o.padding - pr.height,
      );

      root.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;
      root.setAttribute("data-placement", pl);
    },
    dispose: () => {
      api.close();
      if (raf) cancelAnimationFrame(raf);
      raf = 0;

      anchor.removeEventListener("click", onAnchorClick);
      anchor.removeEventListener("mouseenter", onAnchorEnter);
      anchor.removeEventListener("mouseleave", onAnchorLeave);

      contentWrap.removeEventListener("mouseenter", onPopoverEnter);
      contentWrap.removeEventListener("mouseleave", onPopoverLeave);

      if (hoverCloseTimer) window.clearTimeout(hoverCloseTimer);
      hoverCloseTimer = null;

      root.remove();
    },
  };

  anchor.addEventListener("click", onAnchorClick);
  anchor.addEventListener("mouseenter", onAnchorEnter);
  anchor.addEventListener("mouseleave", onAnchorLeave);

  contentWrap.addEventListener("mouseenter", onPopoverEnter);
  contentWrap.addEventListener("mouseleave", onPopoverLeave);

  setAria(anchor, contentWrap, open);

  if (open) api.open();
  return api;
}
