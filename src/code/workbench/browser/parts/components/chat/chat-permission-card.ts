import { h } from "../../../../contrib/core/dom/h";
import { codicon } from "../icon";

export function ChatPermissionCard(opts: {
  tool: string;
  description: string;
  onAllow?: () => void;
  onDeny?: () => void;
  onAllowSession?: () => void;
}): { el: HTMLElement } {
  const btn_row = h("div", { class: "flex items-center gap-1.5 mt-2.5" });

  const status = h("span", {
    class: "text-[11px] text-chat-foreground/40 ml-1 self-center hidden",
  });

  const disable_buttons = () => {
    btn_row.querySelectorAll("button").forEach((b) => {
      (b as HTMLButtonElement).disabled = true;
      b.classList.add("opacity-40", "pointer-events-none");
    });
  };

  const settle = (label: string, fn?: () => void) => {
    disable_buttons();
    status.textContent = label;
    status.classList.remove("hidden");
    fn?.();
  };

  const make_btn = (
    label: string,
    cls: string,
    on_click: (() => void) | undefined,
    settled_label: string,
  ) => {
    const b = h(
      "button",
      {
        class:
          "h-[26px] px-3 text-[11px] rounded-[6px] cursor-pointer transition-colors " +
          cls,
        attrs: { type: "button" },
      },
      label,
    ) as HTMLButtonElement;
    b.addEventListener("click", () => settle(settled_label, on_click));
    btn_row.appendChild(b);
    return b;
  };

  if (opts.onAllow) {
    make_btn(
      "Allow",
      "font-medium border-0 bg-button-primary-background text-button-primary-foreground hover:bg-button-primary-hover-background",
      opts.onAllow,
      "Allowed",
    );
  }

  if (opts.onAllowSession) {
    make_btn(
      "Session",
      "border border-workbench-border text-chat-foreground/70 hover:bg-chat-foreground/5 hover:text-chat-foreground",
      opts.onAllowSession,
      "Allowed for session",
    );
  }

  if (opts.onDeny) {
    make_btn(
      "Deny",
      "border border-workbench-border text-red-400 hover:bg-red-500/10",
      opts.onDeny,
      "Denied",
    );
  }

  btn_row.appendChild(status);

  const tool_label = h(
    "span",
    { class: "font-mono text-[12px] font-medium text-chat-foreground truncate" },
    opts.tool,
  );

  const desc = h(
    "span",
    { class: "text-[11px] text-chat-foreground/50 leading-relaxed mt-0.5" },
    opts.description,
  );

  const el = h(
    "div",
    {
      class:
        "flex flex-col rounded-[8px] border border-chat-border bg-chat-input-background/40 px-3 py-2.5 my-1",
    },
    h(
      "div",
      { class: "flex items-center gap-1.5 min-w-0" },
      codicon("shield", "text-[11px] text-yellow-500/70 shrink-0"),
      tool_label,
    ),
    desc,
    btn_row,
  );

  return { el };
}
