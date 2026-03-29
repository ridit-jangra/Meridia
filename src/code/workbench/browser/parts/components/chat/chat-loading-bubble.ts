import { h } from "../../../../contrib/core/dom/h";

export function ChatLoadingBubble() {
  return h(
    "div",
    { class: "self-start flex items-center gap-[5px] py-2 px-0.5" },
    ...[0, 1, 2].map((i) =>
      h("span", {
        class: "block w-[4px] h-[4px] rounded-full bg-chat-foreground/25",
        style: `animation: chat-dot 1.2s ease-in-out ${i * 180}ms infinite`,
      }),
    ),
  );
}
