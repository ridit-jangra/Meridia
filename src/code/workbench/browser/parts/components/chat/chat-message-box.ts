import { h } from "../../../../contrib/core/dom/h";
import { cn } from "../../../../contrib/core/utils/cn";
import { codicon } from "../icon";

export function ChatMessageBox(opts?: {
  placeholder?: string;
  disabled?: boolean;
  class?: string;
  onSubmit?: (value: string, thinking: boolean) => void;
}) {
  let thinking = false;
  let allow_edits = false;

  const textarea_el = h("textarea", {
    class: cn(
      "w-full bg-transparent resize-none",
      "text-[13px] text-chat-input-foreground leading-[1.6]",
      "placeholder:text-chat-foreground/25",
      "focus:outline-none caret-chat-foreground disabled:opacity-40",
    ),
    attrs: { rows: 1 },
  }) as HTMLTextAreaElement;
  textarea_el.placeholder = opts?.placeholder ?? "Ask anything...";
  textarea_el.spellcheck = false;
  textarea_el.style.overflow = "hidden";
  textarea_el.style.minHeight = "20px";

  function auto_resize() {
    textarea_el.style.height = "auto";
    const capped = Math.min(textarea_el.scrollHeight, 160);
    textarea_el.style.height = capped + "px";
    textarea_el.style.overflow =
      textarea_el.scrollHeight > 160 ? "auto" : "hidden";
  }

  textarea_el.addEventListener("input", auto_resize);
  textarea_el.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  });

  const model_badge = h("span", {
    class:
      "text-[10px] text-chat-foreground/20 font-mono truncate max-w-[150px] select-none leading-none",
    style: "display:none",
  });

  const send_btn = h(
    "button",
    {
      class:
        "flex items-center justify-center w-6 h-6 rounded-[6px] text-chat-foreground/30 hover:text-chat-foreground transition-colors cursor-pointer bg-transparent border-0 shrink-0",
      attrs: { type: "button" },
    },
    codicon("send", "text-[11px]"),
  ) as HTMLButtonElement;

  send_btn.addEventListener("click", (e: MouseEvent) => {
    e.stopPropagation();
    submit();
  });

  function submit() {
    const val = textarea_el.value.trim();
    if (!val) return;
    opts?.onSubmit?.(val, thinking);
  }

  const allow_edits_btn = h(
    "button",
    {
      class:
        "flex items-center gap-1 h-5 px-1.5 rounded-[4px] text-[10px] text-chat-foreground/30 hover:text-chat-foreground/60 transition-colors cursor-pointer bg-transparent border-0 shrink-0 select-none",
      attrs: { type: "button", title: "Auto-approve all tool calls" },
    },
    codicon("pass", "text-[10px]"),
  ) as HTMLButtonElement;

  const allow_edits_label = document.createTextNode("Allow edits");
  allow_edits_btn.appendChild(allow_edits_label);

  function update_allow_edits_style() {
    if (allow_edits) {
      allow_edits_btn.classList.remove("text-chat-foreground/30", "hover:text-chat-foreground/60");
      allow_edits_btn.classList.add("text-yellow-400", "hover:text-yellow-300");
    } else {
      allow_edits_btn.classList.remove("text-yellow-400", "hover:text-yellow-300");
      allow_edits_btn.classList.add("text-chat-foreground/30", "hover:text-chat-foreground/60");
    }
  }

  allow_edits_btn.addEventListener("click", (e: MouseEvent) => {
    e.stopPropagation();
    allow_edits = !allow_edits;
    update_allow_edits_style();
  });

  const footer = h(
    "div",
    { class: "flex items-center mt-1.5" },
    model_badge,
    h(
      "div",
      { class: "flex items-center gap-0.5 ml-auto" },
      allow_edits_btn,
      send_btn,
    ),
  );

  const el = h(
    "div",
    {
      class: cn(
        "shrink-0 flex flex-col mx-3 my-2 rounded-[10px] border border-chat-input-border bg-chat-input-background px-3 pt-2.5 pb-2",
        opts?.class,
      ),
    },
    textarea_el,
    footer,
  );

  el.addEventListener("click", () => textarea_el.focus());

  if (opts?.disabled) {
    textarea_el.disabled = true;
    send_btn.disabled = true;
  }

  return {
    el,
    get value() {
      return textarea_el.value;
    },
    get allowEdits() {
      return allow_edits;
    },
    setValue(v: string) {
      textarea_el.value = v;
      auto_resize();
    },
    clear() {
      textarea_el.value = "";
      textarea_el.style.height = "auto";
    },
    focus() {
      textarea_el.focus();
    },
    setDisabled(val: boolean) {
      textarea_el.disabled = val;
      send_btn.disabled = val;

      el.style.opacity = val ? "0.5" : "";
    },
    setModel(name: string) {
      model_badge.textContent = name;
      model_badge.style.display = name ? "inline" : "none";
    },
  };
}
