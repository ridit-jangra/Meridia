import { CoreEl } from "../core";

type TooltipPos = "top" | "bottom" | "left" | "right";

export class Tooltip extends CoreEl {
  _getEl(
    el: HTMLElement,
    text: string | (() => string),
    position: TooltipPos = "top",
    timeout = 0,
  ) {
    el.style.position ||= "relative";

    const t = document.createElement("div");
    t.className = "tooltip";

    // Set initial text
    const getText = () => (typeof text === "function" ? text() : text);
    t.textContent = getText();

    document.body.appendChild(t);

    const GAP = 0;

    let showTimer: number | null = null;
    let hideTimer: number | null = null;
    let visible = false;
    let destroyed = false;

    const clamp = (v: number, min: number, max: number) =>
      Math.max(min, Math.min(max, v));

    const place = () => {
      if (!visible || destroyed) return;

      const r = el.getBoundingClientRect();

      t.style.left = "0px";
      t.style.top = "0px";
      const tr = t.getBoundingClientRect();

      let left = 0;
      let top = 0;

      if (position === "top") {
        left = r.left + r.width / 2 - tr.width / 2;
        top = r.top - tr.height - GAP;
      }

      if (position === "bottom") {
        left = r.left + r.width / 2 - tr.width / 2;
        top = r.bottom + GAP;
      }

      if (position === "left") {
        left = r.left - tr.width - GAP;
        top = r.top + r.height / 2 - tr.height / 2;
      }

      if (position === "right") {
        left = r.right + GAP;
        top = r.top + r.height / 2 - tr.height / 2;
      }

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      left = clamp(left, 4, vw - tr.width - 4);
      top = clamp(top, 4, vh - tr.height - 4);

      t.style.left = `${left}px`;
      t.style.top = `${top}px`;
    };

    const clearTimers = () => {
      if (showTimer !== null) {
        clearTimeout(showTimer);
        showTimer = null;
      }
      if (hideTimer !== null) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
    };

    const showNow = () => {
      if (destroyed) return;
      clearTimers();
      visible = true;

      // Update text content when showing (for dynamic text)
      t.textContent = getText();

      t.style.display = "block";
      t.style.opacity = "0";
      place();
      requestAnimationFrame(() => {
        if (!visible || destroyed) return;
        t.style.opacity = "1";
      });
    };

    const show = () => {
      if (destroyed) return;
      clearTimers();
      if (timeout > 0) showTimer = window.setTimeout(showNow, timeout);
      else showNow();
    };

    const hide = () => {
      if (destroyed) return;
      clearTimers();
      visible = false;
      t.style.opacity = "0";
      hideTimer = window.setTimeout(() => {
        if (destroyed) return;
        if (!visible) t.style.display = "none";
      }, 160);
    };

    const onScroll = () => place();
    const onResize = () => place();

    const onEnter = () => show();
    const onLeave = () => hide();
    const onClick = () => hide();
    const onCtx = () => hide();

    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    el.addEventListener("click", onClick);
    el.addEventListener("contextmenu", onCtx);

    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);

    const destroy = () => {
      if (destroyed) return;
      destroyed = true;
      clearTimers();

      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
      el.removeEventListener("click", onClick);
      el.removeEventListener("contextmenu", onCtx);

      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);

      t.remove();
    };

    const obs = new MutationObserver(() => {
      if (!document.contains(el)) {
        obs.disconnect();
        destroy();
      }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });

    return el;
  }
}
