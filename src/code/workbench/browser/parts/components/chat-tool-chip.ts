import { h } from "../../../contrib/core/dom/h";
import { codicon } from "./icon";

export interface ToolChipData {
  tool: string;
  args: unknown;
  result: unknown;
}

export function ChatToolChip(t: ToolChipData, opts?: { onExpand?: () => void }) {
  let expanded = false;

  const args_str =
    !t.args || t.args === "{}"
      ? ""
      : typeof t.args === "string"
        ? t.args
        : JSON.stringify(t.args, null, 2);
  const result_str =
    !t.result || t.result === "null"
      ? ""
      : typeof t.result === "string"
        ? t.result
        : JSON.stringify(t.result, null, 2);

  const body_text = [
    args_str ? `args\n${args_str}` : "",
    result_str ? `result\n${result_str}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const body = h("div", {
    class:
      "mt-[2px] px-2.5 py-2 rounded-[6px] text-[11px] font-mono leading-relaxed bg-chat-tool-background text-chat-tool-foreground whitespace-pre-wrap break-all",
    style: "display:none",
  });
  body.textContent = body_text;

  const chevron = codicon(
    "chevron-right",
    "text-[9px] transition-transform duration-150 opacity-50",
  );

  const chip = h(
    "div",
    {
      class:
        "inline-flex items-center gap-1.5 rounded-[5px] px-2 py-[3px] text-[11px] bg-chat-tool-background text-chat-tool-foreground cursor-pointer hover:text-chat-foreground/60 select-none transition-colors duration-150",
      on: {
        click: () => {
          expanded = !expanded;
          body.style.display = expanded ? "block" : "none";
          chevron.style.transform = expanded ? "rotate(90deg)" : "";
          if (expanded) opts?.onExpand?.();
        },
      },
    },
    codicon("tools", "text-[10px] opacity-50"),
    t.tool,
    chevron,
  );

  const el = h("div", { class: "flex flex-col" }, chip, body);

  return {
    el,
    get expanded() {
      return expanded;
    },
  };
}
