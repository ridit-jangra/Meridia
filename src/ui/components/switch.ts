import { cn } from "../common/cn";
import { h } from "../common/h";

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
      "h-5 w-9 border border-input rounded-none relative " +
        "focus-within:ring-1 focus-within:ring-ring",
      opts?.disabled ? "opacity-50 pointer-events-none" : "cursor-pointer",
      opts?.class,
    ),
  });

  const thumb = h("div", {
    class: "h-4 w-4 bg-foreground absolute top-[2px] left-[2px] rounded-none",
  });

  track.appendChild(thumb);

  const sync = () => {
    const on = input.checked;
    thumb.style.transform = on ? "translateX(16px)" : "translateX(0px)";
    track.classList.toggle("bg-accent", on);
    track.classList.toggle("bg-input", !on);
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
