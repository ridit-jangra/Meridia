import { h } from "../../../../contrib/core/dom/h";
import { codicon } from "../icon";

export function ChatPermissionCard(opts: {
  tool: string;
  description: string;
  onAllow?: () => void;
  onDeny?: () => void;
  onAllowSession?: () => void; // new optional callback
}): { el: HTMLElement } {
  const tool_label = h("span", {
    class: "font-mono text-[12px] font-medium text-[#e2e8f0]",
  });
  tool_label.textContent = opts.tool;

  const desc = h("span", {
    class: "text-[11px] text-[#9ca3af] leading-relaxed mt-0.5",
  });
  desc.textContent = opts.description;

  const btn_row = h("div", { class: "flex items-center gap-2 mt-3" });

  const status_text = h("span", {
    class: "text-[11px] text-[#9ca3af] hidden",
  });

  const disable_buttons = () => {
    btn_row.querySelectorAll("button").forEach((b) => {
      (b as HTMLButtonElement).disabled = true;
      b.classList.add("opacity-40", "cursor-not-allowed");
      b.classList.remove("cursor-pointer");
    });
  };

  if (opts.onAllow) {
    const allow_btn = h("button", {
      class:
        "h-6 px-3 text-[11px] rounded-[5px] bg-[#1a3a1a] text-[#6db86d] hover:bg-[#1f4a1f] border border-[#2a4a2a] cursor-pointer transition-colors bg-transparent",
      attrs: { type: "button" },
    });
    allow_btn.textContent = "Allow";
    allow_btn.addEventListener("click", () => {
      disable_buttons();
      status_text.textContent = "Executing...";
      status_text.classList.remove("hidden");
      opts.onAllow!();
    });
    btn_row.appendChild(allow_btn);
  }

  // New Session button, placed between Allow and Deny
  if (opts.onAllowSession) {
    const session_btn = h("button", {
      class:
        "h-6 px-3 text-[11px] rounded-[5px] bg-[#1a3a1a] text-[#6db86d] hover:bg-[#1f4a1f] border border-[#2a4a2a] cursor-pointer transition-colors bg-transparent opacity-70",
      attrs: { type: "button" },
    });
    session_btn.textContent = "Session";
    session_btn.addEventListener("click", () => {
      disable_buttons();
      status_text.textContent = "Session allowed";
      status_text.classList.remove("hidden");
      opts.onAllowSession!();
    });
    btn_row.appendChild(session_btn);
  }

  if (opts.onDeny) {
    const deny_btn = h("button", {
      class:
        "h-6 px-3 text-[11px] rounded-[5px] bg-[#2a1a1a] text-[#d16464] hover:bg-[#3a1a1a] border border-[#4a2a2a] cursor-pointer transition-colors",
      attrs: { type: "button" },
    });
    deny_btn.textContent = "Deny";
    deny_btn.addEventListener("click", () => {
      disable_buttons();
      status_text.textContent = "Denied";
      status_text.classList.remove("hidden");
      opts.onDeny!();
    });
    btn_row.appendChild(deny_btn);
  }

  btn_row.appendChild(status_text);

  const el = h(
    "div",
    {
      class:
        "flex flex-col rounded-[8px] border border-[#3a3020] bg-[#1a1a14] px-3.5 py-3 max-w-[85%] my-1",
    },
    h(
      "div",
      { class: "flex items-center gap-2" },
      codicon("shield", "text-[11px] text-[#d4a84b] opacity-70 shrink-0"),
      tool_label,
    ),
    desc,
    btn_row,
  );

  return { el };
}
