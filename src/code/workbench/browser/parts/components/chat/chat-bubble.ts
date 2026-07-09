import { h } from "../../../../contrib/core/dom/h";
import { marked } from "marked";

export type ChatBubbleRole = "user" | "assistant";

export function ChatBubble(opts: {
  role: ChatBubbleRole;
  text: string;
  is_error?: boolean;
}) {
  const wrap = h("div", { class: "flex flex-col gap-1 w-full min-w-0" });

  const label = h(
    "div",
    {
      class:
        "text-[10px] uppercase tracking-[0.09em] font-semibold text-chat-foreground/35 select-none",
    },
    opts.role === "user" ? "You" : "Assistant",
  );
  wrap.appendChild(label);

  if (opts.role === "user") {
    const body = h("div", {
      class:
        "text-[13px] leading-[1.7] whitespace-pre-wrap break-words text-chat-foreground/85",
    });
    body.textContent = opts.text;
    wrap.appendChild(body);
    return wrap;
  }

  if (opts.is_error) {
    const body = h("div", {
      class:
        "text-[13px] leading-[1.7] break-words text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2",
    });
    body.textContent = opts.text;
    wrap.appendChild(body);
    return wrap;
  }

  const body = h("div", {
    class:
      "text-[13px] leading-[1.75] break-words text-chat-assistant-foreground chat-prose",
  });
  body.innerHTML = marked.parse(opts.text) as string;
  wrap.appendChild(body);
  return wrap;
}
