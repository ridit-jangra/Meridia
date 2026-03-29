import { h } from "../../../../contrib/core/dom/h";
import { codicon } from "../icon";
import { ChatDiffView } from "./chat-diff-view";
import hljs from "highlight.js";

export interface ToolChipData {
  tool: string;
  args: unknown;
  result: unknown;
}

function tool_icon(tool: string): HTMLElement {
  const map: Record<string, string> = {
    write: "edit",
    writeFile: "edit",
    bash: "terminal",
    read: "file-text",
    ls: "list-tree",
  };
  return codicon(map[tool] ?? "tools", "text-[10px] shrink-0 opacity-40");
}

function tool_preview(t: ToolChipData): string {
  const args = t.args as Record<string, unknown> | null;
  if (!args) return "";
  switch (t.tool) {
    case "write":
    case "writeFile":
    case "readFile":
    case "read": {
      const p = String(args.path ?? "");
      return p.split(/[\\/]/).pop() ?? p;
    }
    case "bash":
      return String(args.command ?? "").slice(0, 60);
    case "ls":
      return String(args.path ?? "");
    default:
      return "";
  }
}

function lang_from_path(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    rs: "rust",
    go: "go",
    json: "json",
    md: "markdown",
    css: "css",
    html: "html",
    sh: "bash",
    bash: "bash",
    yaml: "yaml",
    yml: "yaml",
    toml: "ini",
    c: "c",
    cpp: "cpp",
    cs: "csharp",
    java: "java",
    kt: "kotlin",
    rb: "ruby",
    sql: "sql",
    xml: "xml",
    svelte: "xml",
  };
  return map[ext] ?? "plaintext";
}

function render_body(t: ToolChipData): HTMLElement {
  if (t.tool === "write" || t.tool === "writeFile") {
    const args = t.args as { path?: string; content?: string } | null;
    const result = t.result as { ok?: boolean; prevContent?: string } | null;

    const path = args?.path ?? "";
    const newContent = args?.content ?? "";
    const prevContent = result?.prevContent ?? "";

    if (!prevContent) {
      const lang = lang_from_path(path);
      const safe_lang = hljs.getLanguage(lang) ? lang : "plaintext";
      const highlighted = hljs.highlight(newContent, {
        language: safe_lang,
      }).value;

      const path_row = h("div", {
        class:
          "px-2.5 py-1.5 border-b border-chat-border font-mono text-[10px] text-chat-foreground truncate select-none",
      });
      path_row.textContent = path;

      const code_el = h("code", {
        class: `hljs language-${safe_lang} block text-[11px] font-mono leading-relaxed whitespace-pre`,
      });
      code_el.innerHTML = highlighted;

      const pre_el = h("pre", {
        class: "m-0 bg-transparent write-code",
      });
      pre_el.appendChild(code_el);

      const wrapper = h("div", {
        class: "mt-1 rounded-[6px] overflow-hidden border border-chat-border",
      });
      wrapper.appendChild(path_row);
      wrapper.appendChild(pre_el);
      return wrapper;
    }

    const diff = ChatDiffView({
      path,
      prevContent,
      newContent,
      onAccept: () => console.log("accept", path),
      onReject: () => console.log("reject", path),
    });
    return diff.el;
  }

  if (t.tool === "bash") {
    const args = t.args as { command?: string } | null;
    const output =
      !t.result || t.result === "null"
        ? ""
        : typeof t.result === "string"
          ? t.result
          : JSON.stringify(t.result, null, 2);

    const wrapper = h("div", {
      class: "mt-1 rounded-[6px] overflow-hidden border border-chat-border",
    });

    if (args?.command) {
      const cmd_row = h("div", {
        class:
          "flex items-center gap-2 px-2.5 py-1.5 border-b border-chat-border",
      });
      const prompt = h("span", {
        class:
          "text-[#A3D977] font-mono text-[10px] shrink-0 opacity-50 select-none",
      });
      prompt.textContent = "$";
      const cmd_el = h("span", {
        class: "font-mono text-[11px] text-[#E6E6E6CC] truncate",
      });
      cmd_el.textContent = args.command;
      cmd_row.appendChild(prompt);
      cmd_row.appendChild(cmd_el);
      wrapper.appendChild(cmd_row);
    }

    if (output) {
      const out_el = h("div", {
        class:
          "px-2.5 py-2 font-mono text-[11px] text-[#E6E6E660] whitespace-pre-wrap break-all max-h-[180px] overflow-y-auto leading-relaxed",
      });
      out_el.textContent = output;
      wrapper.appendChild(out_el);
    }

    return wrapper;
  }

  if (t.tool === "read" || t.tool === "readFile") {
    const args = t.args as { path?: string } | null;
    const path = args?.path ?? "";

    const raw = t.result as any;

    const content =
      typeof raw === "string"
        ? raw
        : typeof raw?.content === "string"
          ? raw.content
          : "";

    const lang = lang_from_path(path);
    const safe_lang = hljs.getLanguage(lang) ? lang : "plaintext";
    const highlighted = hljs.highlight(content, {
      language: safe_lang,
    }).value;

    const path_row = h("div", {
      class:
        "px-2.5 py-1.5 border-b border-chat-border font-mono text-[10px] text-chat-foreground truncate select-none",
    });
    path_row.textContent = path;

    const code_el = h("code", {
      class: `hljs language-${safe_lang} block text-[11px] font-mono leading-relaxed whitespace-pre`,
    });
    code_el.innerHTML = highlighted;

    const pre_el = h("pre", {
      class: "m-0 bg-transparent write-code",
    });
    pre_el.appendChild(code_el);

    const wrapper = h("div", {
      class: "mt-1 rounded-[6px] overflow-hidden border border-chat-border",
    });

    if (args?.path) {
      const path_row = h("div", {
        class:
          "px-2.5 py-1.5 border-b border-chat-border font-mono text-[10px] text-[#E6E6E640] truncate",
      });
      path_row.textContent = args.path;
      wrapper.appendChild(path_row);
    }

    // wrapper.appendChild(path_row);
    wrapper.appendChild(pre_el);

    return wrapper;
  }

  if (t.tool === "ls") {
    const result_str =
      typeof t.result === "string"
        ? t.result
        : JSON.stringify(t.result, null, 2);

    const wrapper = h("div", {
      class:
        "mt-1 rounded-[6px] border border-chat-border bg-[#0D0D0D] px-2.5 py-2 font-mono text-[11px] text-[#E6E6E660] whitespace-pre-wrap break-all max-h-[200px] overflow-y-auto leading-relaxed",
    });
    wrapper.textContent = result_str;
    return wrapper;
  }

  // fallback
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

  const lines = [
    args_str ? `args\n${args_str}` : "",
    result_str ? `result\n${result_str}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const wrapper = h("div", {
    class:
      "mt-1 rounded-[6px] border border-chat-border bg-[#0D0D0D] px-2.5 py-2 font-mono text-[11px] text-[#E6E6E660] whitespace-pre-wrap break-all",
  });
  wrapper.textContent = lines;
  return wrapper;
}

export function ChatToolChip(t: ToolChipData) {
  const default_expanded = t.tool === "write" || t.tool === "writeFile";
  let expanded = default_expanded;

  const body_el = render_body(t);
  body_el.style.display = expanded ? "" : "none";

  const preview_text = tool_preview(t);

  const chevron = codicon(
    "chevron-right",
    "text-[9px] opacity-20 shrink-0 ml-auto transition-transform duration-150",
  );
  chevron.style.transform = expanded ? "rotate(90deg)" : "";

  const header_children: HTMLElement[] = [
    tool_icon(t.tool),
    (() => {
      const s = h("span", {
        class: "text-[11px] text-chat-foreground/40 shrink-0",
      });
      s.textContent = t.tool;
      return s;
    })(),
  ];

  if (preview_text) {
    const preview_el = h("span", {
      class: "text-[10px] text-chat-foreground/20 font-mono truncate min-w-0",
    });
    preview_el.textContent = preview_text;
    header_children.push(preview_el);
  }

  header_children.push(chevron);

  const chip = h("div", {
    class:
      "flex items-center gap-1.5 w-full rounded-[6px] px-2 py-[4px] cursor-pointer select-none hover:bg-[#FFFFFF08] transition-colors duration-150 min-w-0 overflow-hidden sticky top-0 z-10",
    style: "background: var(--chat-background)",
  });
  for (const c of header_children) chip.appendChild(c);

  chip.addEventListener("click", () => {
    expanded = !expanded;
    body_el.style.display = expanded ? "" : "none";
    chevron.style.transform = expanded ? "rotate(90deg)" : "";
  });

  const el = h("div", { class: "flex flex-col min-w-0" }, chip, body_el);

  return { el };
}
