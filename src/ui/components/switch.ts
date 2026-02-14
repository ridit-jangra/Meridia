import { cn } from "../../core/utils/cn";
import { h } from "../../core/dom/h";

export function Switch(opts?: {
  checked?: boolean;
  disabled?: boolean;
  class?: string;
  onChange?: (checked: boolean) => void;
}) {
  const input = h("input", {
    class: "sr-only",
    attrs: {
      type: "checkbox",
      checked: opts?.checked ?? false,
      disabled: opts?.disabled ?? false,
    },
  }) as HTMLInputElement;

  const track = h("div", {
    class: cn(
      "relative inline-flex h-6 w-11 items-center rounded-full border-2 border-input-border " +
        "bg-input-background focus-within:ring-1",
      opts?.disabled ? "opacity-50 pointer-events-none" : "cursor-pointer",
      opts?.class,
    ),
  });

  const thumb = h("div", {
    class:
      "absolute left-0.5 top-0 h-5 w-5 rounded-full bg-select-foreground transition-transform",
  });

  track.appendChild(thumb);

  const sync = () => {
    const on = input.checked;

    thumb.style.transform = on ? "translateX(16px)" : "translateX(0px)";

    track.classList.toggle("bg-button-primary-background/60", on);
    track.classList.toggle("bg-input-background", !on);
  };

  sync();

  const toggle = () => {
    if (input.disabled) return;
    input.checked = !input.checked;
    sync();
    opts?.onChange?.(input.checked);
  };

  track.addEventListener("click", toggle);

  const el = h("div", { class: "inline-flex items-center" }, input, track);

  return {
    el,
    input,
    get checked() {
      return input.checked;
    },
    setChecked(v: boolean) {
      input.checked = v;
      sync();
      opts?.onChange?.(input.checked);
    },
    destroy() {
      track.removeEventListener("click", toggle);
    },
  };
}
