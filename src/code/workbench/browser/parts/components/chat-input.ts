import { h } from "../../../contrib/core/dom/h";
import { cn } from "../../../contrib/core/utils/cn";
import { Button } from "./button";
import { codicon } from "./icon";

export function ChatInput(opts?: {
  placeholder?: string;
  disabled?: boolean;
  class?: string;
  onSubmit?: (value: string) => void;
}) {
  const input_el = h("input", {
    class: cn(
      "flex-1 min-w-0 h-8 bg-transparent",
      "text-[13px] text-chat-input-foreground",
      "placeholder:text-chat-foreground/25",
      "focus:outline-none caret-chat-foreground disabled:opacity-40",
    ),
    attrs: { type: "text", placeholder: opts?.placeholder ?? "Message..." },
    on: {
      keydown: (e: KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          submit();
        }
      },
    },
  }) as HTMLInputElement;
  input_el.spellcheck = false;

  const send_btn = Button(codicon("send", "text-[11px]"), {
    variant: "ghost",
    size: "icon",
    class:
      "shrink-0 w-7 h-7 rounded-[6px] text-chat-foreground/30 hover:text-chat-foreground cursor-pointer",
    onClick: () => submit(),
  });

  function submit() {
    const val = input_el.value.trim();
    if (!val) return;
    opts?.onSubmit?.(val);
  }

  const el = h(
    "div",
    {
      class: cn(
        "shrink-0 flex items-center gap-1 mx-3 my-2 rounded-[9px] border border-chat-input-border bg-chat-input-background px-2",
        opts?.class,
      ),
      on: { click: () => input_el.focus() },
    },
    input_el,
    send_btn,
  );

  if (opts?.disabled) {
    input_el.disabled = true;
    (send_btn as HTMLButtonElement).disabled = true;
  }

  return {
    el,
    get value() {
      return input_el.value;
    },
    setValue(v: string) {
      input_el.value = v;
    },
    clear() {
      input_el.value = "";
    },
    focus() {
      input_el.focus();
    },
    setDisabled(val: boolean) {
      input_el.disabled = val;
      (send_btn as HTMLButtonElement).disabled = val;
    },
  };
}
