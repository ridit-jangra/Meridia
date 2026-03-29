import { h } from "../../../../contrib/core/dom/h";
import { marked } from "marked";

export type ChatBubbleRole = "user" | "assistant";

export function ChatBubble(opts: {
  role: ChatBubbleRole;
  text: string;
  is_error?: boolean;
}) {
  if (opts.role === "user") {
    const bubble = h("div", {
      class:
        "self-end text-[13px] leading-[1.7] break-words rounded-[10px] py-1.5 px-3.5 bg-chat-user-background text-chat-user-foreground whitespace-pre-wrap",
    });
    bubble.textContent = opts.text;
    return bubble;
  }

  if (opts.is_error) {
    const bubble = h("div", {
      class:
        "self-start w-full text-[13px] leading-[1.75] break-words text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2",
    });
    bubble.textContent = opts.text;
    return bubble;
  }

  const bubble = h("div", {
    class:
      "self-start w-full text-[13px] leading-[1.75] break-words text-chat-assistant-foreground chat-prose py-0.5",
  });
  bubble.innerHTML = marked.parse(opts.text) as string;
  return bubble;
}
