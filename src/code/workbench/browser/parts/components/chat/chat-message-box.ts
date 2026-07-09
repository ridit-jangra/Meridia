import { h } from "../../../../contrib/core/dom/h";
import { cn } from "../../../../contrib/core/utils/cn";
import { codicon } from "../icon";
import { Dropdown, type DropdownItem } from "../dropdown";
import { settings_service } from "../../../../../platform/settings/settings.service";
import { models_for } from "../../../../../../../shared/ai/catalog";

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

  textarea_el.addEventListener("input", () => {
    auto_resize();
    update_send_state();
  });
  textarea_el.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  });

  const model_label = h("span", {
    class: "truncate max-w-[150px]",
  });

  const model_btn = h(
    "button",
    {
      class:
        "flex items-center gap-1 h-5 px-1.5 rounded-[4px] text-[10px] font-mono text-chat-foreground/40 hover:text-chat-foreground/80 hover:bg-chat-foreground/5 transition-colors cursor-pointer bg-transparent border-0 select-none leading-none max-w-[170px]",
      attrs: { type: "button", title: "Select model" },
    },
    model_label,
    codicon("chevron-down", "text-[9px] shrink-0 opacity-60"),
  ) as HTMLButtonElement;

  const short_model = (m: string) => m.split("/").pop() || m;

  const sync_model_label = () => {
    model_label.textContent = short_model(settings_service.get().ai_model);
  };
  sync_model_label();

  // Keep the default dropdown look (Popover provides the panel); only add
  // scrolling for long model lists.
  const MODEL_MENU_CLASS = "max-h-[260px] overflow-y-auto";

  const model_items = (): DropdownItem[] => {
    const s = settings_service.get();
    const models = Array.from(
      new Set([...models_for(s.ai_provider), s.ai_model]),
    );
    return models.map((m) => ({
      label: m,
      key: m === s.ai_model ? "✓" : undefined,
      onClick: () => void settings_service.save({ ai_model: m }),
    }));
  };

  const make_dropdown = () =>
    Dropdown({
      anchor: model_btn,
      placement: "top",
      align: "start",
      items: model_items(),
      menuClass: MODEL_MENU_CLASS,
    });

  let model_dropdown = make_dropdown();

  // Rebuild so the item list reflects a provider/model change from Settings.
  const off_settings = settings_service.subscribe(() => {
    sync_model_label();
    model_dropdown.dispose();
    model_dropdown = make_dropdown();
  });

  const send_btn = h(
    "button",
    {
      class:
        "flex items-center justify-center w-[26px] h-[26px] rounded-full border-0 shrink-0 transition-all duration-150",
      attrs: { type: "button" },
    },
    codicon("arrow-up", "text-[13px]"),
  ) as HTMLButtonElement;

  // Muted when empty, accent + active when there's something to send.
  const ACCENT = [
    "bg-button-primary-background",
    "text-button-primary-foreground",
    "hover:bg-button-primary-hover-background",
    "cursor-pointer",
  ];
  const MUTED = ["bg-chat-foreground/10", "text-chat-foreground/30"];

  function update_send_state() {
    const active = textarea_el.value.trim().length > 0 && !textarea_el.disabled;
    send_btn.classList.toggle("cursor-default", !active);
    for (const c of ACCENT) send_btn.classList.toggle(c, active);
    for (const c of MUTED) send_btn.classList.toggle(c, !active);
  }
  update_send_state();

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
      allow_edits_btn.classList.remove(
        "text-chat-foreground/30",
        "hover:text-chat-foreground/60",
      );
      allow_edits_btn.classList.add("text-yellow-400", "hover:text-yellow-300");
    } else {
      allow_edits_btn.classList.remove(
        "text-yellow-400",
        "hover:text-yellow-300",
      );
      allow_edits_btn.classList.add(
        "text-chat-foreground/30",
        "hover:text-chat-foreground/60",
      );
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
    model_btn,
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
        "shrink-0 flex flex-col mx-3 my-2 rounded-[12px] border border-chat-input-border bg-chat-input-background px-3.5 pt-3 pb-2.5",
        "transition-colors focus-within:border-chat-foreground/25",
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
      update_send_state();
    },
    clear() {
      textarea_el.value = "";
      textarea_el.style.height = "auto";
      update_send_state();
    },
    focus() {
      textarea_el.focus();
    },
    setDisabled(val: boolean) {
      textarea_el.disabled = val;
      send_btn.disabled = val;
      update_send_state();

      el.style.opacity = val ? "0.5" : "";
    },
    setModel(name: string) {
      if (name) model_label.textContent = short_model(name);
    },
    destroy() {
      off_settings();
      model_dropdown.dispose();
    },
  };
}
