import { h } from "../../../contrib/core/dom/h";
import { cn } from "../../../contrib/core/utils/cn";
import { marked } from "marked";

export type ChatBubbleRole = "user" | "assistant";

export function ChatBubble(opts: { role: ChatBubbleRole; text: string }) {
  const bubble = h("div", {
    class: cn(
      "max-w-[85%] text-[13px] leading-[1.7] break-words",
      opts.role === "user"
        ? "self-end rounded-[16px] rounded-br-[4px] px-3.5 py-2.5 bg-chat-user-background text-chat-user-foreground whitespace-pre-wrap"
        : "self-start rounded-[16px] rounded-bl-[4px] px-3.5 py-2.5 bg-chat-assistant-background text-chat-assistant-foreground chat-prose",
    ),
  });

  if (opts.role === "assistant") {
    bubble.innerHTML = marked.parse(opts.text) as string;
  } else {
    bubble.textContent = opts.text;
  }

  return bubble;
}
