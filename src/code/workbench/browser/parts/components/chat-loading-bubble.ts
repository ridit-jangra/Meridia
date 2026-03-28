import { h } from "../../../contrib/core/dom/h";

export function ChatLoadingBubble() {
  return h(
    "div",
    {
      class:
        "self-start flex items-center gap-[5px] px-3.5 py-[11px] rounded-[16px] rounded-bl-[4px] bg-chat-assistant-background",
    },
    ...[0, 1, 2].map((i) =>
      h("span", {
        class:
          "block w-[5px] h-[5px] rounded-full bg-chat-assistant-foreground/40",
        style: `animation: chat-dot 1.2s ease-in-out ${i * 180}ms infinite`,
      }),
    ),
  );
}
