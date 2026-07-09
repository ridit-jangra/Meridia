import { h } from "../../../../contrib/core/dom/h";
import { cn } from "../../../../contrib/core/utils/cn";
import { codicon } from "../icon";
import { ChatDiffView } from "./chat-diff-view";
import hljs from "highlight.js";
// import { Permission } from "../../../../../../../shared/types/chat.types";

export interface Tool {
  tool: string;
  input: Record<string, any>;
  output: Record<string, any> | string | null;
}

function tool_icon(tool: string): HTMLElement {
  const map: Record<string, string> = {
    WriteFileTool: "new-file",
    EditFileTool: "diff",
    FileEditTool: "diff",
    ReadFileTool: "file",
    FileReadTool: "file",
    ReadManyFilesTool: "files",
    ListDirTool: "list-tree",
    CreateDirTool: "new-folder",
    OpenFileTool: "go-to-file",
    GotoLineTool: "list-selection",
    GetActiveFileTool: "file-code",
    GetSelectionTool: "selection",
    RunCommandTool: "terminal",
    ReadTerminalTool: "terminal",
    BashTool: "terminal",
    LspDiagnosticsTool: "warning",
    LspHoverTool: "info",
    LspDefinitionTool: "symbol-method",
    LspReferencesTool: "references",
    LspSymbolsTool: "symbol-class",
    GlobTool: "list-tree",
    GrepTool: "search",
    ThinkTool: "lightbulb",
    AgentTool: "robot",
    WebSearchTool: "globe",
    WebFetchTool: "link",
    MemoryReadTool: "database",
    MemoryWriteTool: "database",
    MemoryEditTool: "database",
    MemoryListTool: "database",
    RecallTool: "history",
    CompactTool: "archive",
  };
  return codicon(map[tool] ?? "tools", "text-[10px] shrink-0 opacity-40");
}

// Friendly, compact labels for the tool chips.
function tool_label(tool: string): string {
  const map: Record<string, string> = {
    WriteFileTool: "Write",
    EditFileTool: "Edit",
    FileEditTool: "Edit",
    ReadFileTool: "Read",
    ListDirTool: "List",
    CreateDirTool: "New folder",
    OpenFileTool: "Open",
    GotoLineTool: "Go to line",
    GetActiveFileTool: "Active file",
    GetSelectionTool: "Selection",
    RunCommandTool: "Run",
    ReadTerminalTool: "Terminal",
    LspDiagnosticsTool: "Diagnostics",
    LspHoverTool: "Hover",
    LspDefinitionTool: "Definition",
    LspReferencesTool: "References",
    LspSymbolsTool: "Symbols",
    ThinkTool: "Think",
    MemoryReadTool: "Memory",
    MemoryWriteTool: "Memory",
    MemoryEditTool: "Memory",
    MemoryListTool: "Memory",
  };
  return map[tool] ?? tool.replace(/Tool$/, "");
}

function tool_preview(t: Tool): string {
  const input = t.input ?? {};
  const basename = (p: string) => p.split(/[\\/]/).pop() ?? p;
  switch (t.tool) {
    case "WriteFileTool":
    case "EditFileTool":
    case "FileEditTool":
    case "ReadFileTool":
    case "ReadManyFilesTool":
    case "OpenFileTool":
    case "GotoLineTool":
    case "LspDiagnosticsTool":
    case "LspHoverTool":
    case "LspDefinitionTool":
    case "LspReferencesTool":
    case "LspSymbolsTool":
      return basename(String(input.path ?? ""));
    case "ListDirTool":
    case "CreateDirTool":
      return basename(String(input.path ?? ""));
    case "RunCommandTool":
    case "BashTool":
      return String(input.command ?? "").slice(0, 60);
    case "GlobTool":
    case "GrepTool":
      return String(input.pattern ?? input.path ?? "");
    case "ThinkTool":
      return String(input.thought ?? "").slice(0, 60);
    case "WebSearchTool":
      return String(input.query ?? "").slice(0, 60);
    case "WebFetchTool":
      return String(input.url ?? "").slice(0, 60);
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

interface PendingOpts {
  onAccept: () => void;
  onReject: () => void;
}

function make_action_row(pending: PendingOpts): HTMLElement {
  const status = h("span", {
    class: "text-[10px] text-chat-foreground/30 hidden",
  });

  const disable = () => {
    accept_btn.disabled = true;
    reject_btn.disabled = true;
    accept_btn.classList.add("opacity-40", "cursor-not-allowed");
    reject_btn.classList.add("opacity-40", "cursor-not-allowed");
  };

  const accept_btn = h("button", {
    class:
      "h-5 px-2 text-[10px] rounded-[4px] bg-[#1a3a1a] text-[#6db86d] hover:bg-[#1f4a1f] border border-[#2a4a2a] cursor-pointer transition-colors",
    attrs: { type: "button" },
  }) as HTMLButtonElement;
  accept_btn.textContent = "Accept";
  accept_btn.addEventListener("click", (e) => {
    e.stopPropagation();
    disable();
    status.textContent = "Applying...";
    status.classList.remove("hidden");
    pending.onAccept();
  });

  const reject_btn = h("button", {
    class:
      "h-5 px-2 text-[10px] rounded-[4px] bg-[#2a1a1a] text-[#d16464] hover:bg-[#3a1a1a] border border-[#4a2a2a] cursor-pointer transition-colors",
    attrs: { type: "button" },
  }) as HTMLButtonElement;
  reject_btn.textContent = "Reject";
  reject_btn.addEventListener("click", (e) => {
    e.stopPropagation();
    disable();
    status.textContent = "Rejected";
    status.classList.remove("hidden");
    pending.onReject();
  });

  const row = h("div", { class: "flex items-center gap-1.5 ml-auto shrink-0" });
  row.appendChild(status);
  row.appendChild(accept_btn);
  row.appendChild(reject_btn);
  return row;
}

function render_body(t: Tool, pending?: PendingOpts): HTMLElement {
  if (t.tool === "WriteFileTool") {
    const input = t.input as { path?: string; content?: string } | null;
    const output = t.output as { ok?: boolean; prevContent?: string } | null;

    const path = input?.path ?? "";
    const newContent = input?.content ?? "";
    const prevContent = output?.prevContent ?? "";

    if (!prevContent) {
      const lang = lang_from_path(path);
      const safe_lang = hljs.getLanguage(lang) ? lang : "plaintext";
      const highlighted = hljs.highlight(newContent, {
        language: safe_lang,
      }).value;

      const path_row = h("div", {
        class:
          "flex items-center gap-2 px-2.5 py-1.5 border-b border-chat-border",
      });
      const path_text = h("span", {
        class:
          "font-mono text-[10px] text-chat-foreground truncate select-none min-w-0",
      });
      path_text.textContent = path;
      path_row.appendChild(path_text);
      if (pending) path_row.appendChild(make_action_row(pending));

      const code_el = h("code", {
        class: `hljs language-${safe_lang} block text-[11px] font-mono leading-relaxed whitespace-pre`,
      });
      code_el.innerHTML = highlighted;
      const pre_el = h("pre", { class: "m-0 bg-transparent write-code" });
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
      onAccept: pending ? () => pending.onAccept() : () => {},
      onReject: pending ? () => pending.onReject() : () => {},
    });
    return diff.el;
  }

  if (t.tool === "FileEditTool") {
    const input = t.input as {
      path?: string;
      old_string?: string;
      new_string?: string;
    } | null;
    const path = input?.path ?? "";
    const prevContent = input?.old_string ?? "";
    const newContent = input?.new_string ?? "";

    if (prevContent || newContent) {
      const diff = ChatDiffView({
        path,
        prevContent,
        newContent,
        onAccept: pending ? () => pending.onAccept() : () => {},
        onReject: pending ? () => pending.onReject() : () => {},
      });
      return diff.el;
    }

    const wrapper = h("div", {
      class:
        "mt-1 rounded-[6px] border border-chat-border px-2.5 py-2 font-mono text-[10px] text-chat-foreground/40",
    });
    wrapper.textContent = path || "edit";
    return wrapper;
  }

  if (t.tool === "BashTool") {
    const input = t.input as { command?: string } | null;
    const raw = t.output;
    const output =
      !raw || raw === "null"
        ? ""
        : typeof raw === "string"
          ? raw
          : (raw as any).stdout
            ? `${(raw as any).stdout}${(raw as any).stderr ? "\n" + (raw as any).stderr : ""}`
            : JSON.stringify(raw, null, 2);

    const wrapper = h("div", {
      class: "mt-1 rounded-[6px] overflow-hidden border border-chat-border",
    });

    if (input?.command) {
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
      cmd_el.textContent = input.command;
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

  if (t.tool === "ThinkTool") {
    const input = t.input as { thought?: string } | null;
    const thought = input?.thought ?? "";

    console.log(input);

    const wrapper = h("div", {
      class: "mt-1 rounded-[6px] overflow-hidden border border-chat-border",
    });

    const header = h("div", {
      class:
        "flex items-center gap-2 px-2.5 py-1.5 border-b border-chat-border",
    });
    const label = h("span", {
      class: "font-mono text-[10px] text-chat-foreground/40 select-none",
    });
    label.textContent = "thinking...";
    header.appendChild(label);
    wrapper.appendChild(header);

    if (thought) {
      const out_el = h("div", {
        class:
          "px-2.5 py-2 font-mono text-[11px] text-[#E6E6E660] whitespace-pre-wrap break-all max-h-[180px] overflow-y-auto leading-relaxed italic",
      });
      out_el.textContent = thought;
      wrapper.appendChild(out_el);
    }

    return wrapper;
  }

  if (t.tool === "ReadFileTool") {
    const input = t.input as { path?: string } | null;
    const path = input?.path ?? "";
    const raw = t.output as any;
    const content =
      typeof raw === "string"
        ? raw
        : typeof raw?.content === "string"
          ? raw.content
          : "";

    const lang = lang_from_path(path);
    const safe_lang = hljs.getLanguage(lang) ? lang : "plaintext";
    const highlighted = hljs.highlight(content, { language: safe_lang }).value;

    const code_el = h("code", {
      class: `hljs language-${safe_lang} block text-[11px] font-mono leading-relaxed whitespace-pre`,
    });
    code_el.innerHTML = highlighted;
    const pre_el = h("pre", { class: "m-0 bg-transparent write-code" });
    pre_el.appendChild(code_el);

    const wrapper = h("div", {
      class: "mt-1 rounded-[6px] overflow-hidden border border-chat-border",
    });
    if (path) {
      const path_row = h("div", {
        class:
          "px-2.5 py-1.5 border-b border-chat-border font-mono text-[10px] text-[#E6E6E640] truncate",
      });
      path_row.textContent = path;
      wrapper.appendChild(path_row);
    }
    wrapper.appendChild(pre_el);
    return wrapper;
  }

  if (t.tool === "GrepTool") {
    const raw = t.output as any;
    const matches: Array<{ path: string; line_number: number; line: string }> =
      Array.isArray(raw?.matches) ? raw.matches : [];

    const wrapper = h("div", {
      class: "mt-1 rounded-[6px] overflow-hidden border border-chat-border",
    });
    const count_row = h("div", {
      class:
        "px-2.5 py-1.5 border-b border-chat-border font-mono text-[10px] text-chat-foreground/40",
    });
    count_row.textContent = `${matches.length} match${matches.length !== 1 ? "es" : ""}`;
    wrapper.appendChild(count_row);

    if (matches.length) {
      const list = h("div", { class: "max-h-[180px] overflow-y-auto" });
      matches.slice(0, 20).forEach((m) => {
        const row = h("div", {
          class:
            "flex gap-2 px-2.5 py-[3px] font-mono text-[10px] text-chat-foreground/50 hover:bg-white/5",
        });
        const ln = h("span", {
          class: "shrink-0 opacity-40 tabular-nums w-8 text-right",
        });
        ln.textContent = String(m.line_number);
        const line = h("span", { class: "truncate" });
        line.textContent = m.line.trim();
        row.appendChild(ln);
        row.appendChild(line);
        list.appendChild(row);
      });
      wrapper.appendChild(list);
    }

    return wrapper;
  }

  if (t.tool === "GlobTool") {
    const raw = t.output as any;
    const paths: string[] = Array.isArray(raw?.paths) ? raw.paths : [];

    const wrapper = h("div", {
      class: "mt-1 rounded-[6px] overflow-hidden border border-chat-border",
    });
    const count_row = h("div", {
      class:
        "px-2.5 py-1.5 border-b border-chat-border font-mono text-[10px] text-chat-foreground/40",
    });
    count_row.textContent = `${paths.length} file${paths.length !== 1 ? "s" : ""}`;
    wrapper.appendChild(count_row);

    if (paths.length) {
      const list = h("div", {
        class: "max-h-[150px] overflow-y-auto px-2.5 py-1.5",
      });
      paths.slice(0, 30).forEach((p) => {
        const row = h("div", {
          class:
            "font-mono text-[10px] text-chat-foreground/50 py-[2px] truncate",
        });
        row.textContent = p;
        list.appendChild(row);
      });
      wrapper.appendChild(list);
    }

    return wrapper;
  }

  if (t.tool === "WebSearchTool") {
    const raw = t.output as any;
    const results: Array<{ title: string; url: string; snippet: string }> =
      Array.isArray(raw?.results) ? raw.results : [];

    const wrapper = h("div", {
      class:
        "mt-1 rounded-[6px] overflow-hidden border border-chat-border max-h-[200px] overflow-y-auto",
    });
    results.slice(0, 5).forEach((r) => {
      const row = h("div", {
        class: "px-2.5 py-2 border-b border-chat-border last:border-0",
      });
      const title = h("div", {
        class: "font-mono text-[10px] text-chat-foreground/70 truncate",
      });
      title.textContent = r.title;
      const url = h("div", {
        class: "font-mono text-[9px] text-chat-foreground/30 truncate mt-[2px]",
      });
      url.textContent = r.url;
      row.appendChild(title);
      row.appendChild(url);
      wrapper.appendChild(row);
    });

    return wrapper;
  }

  return default_body(t);
}

// ---- Generic input/output rendering for tools without a bespoke view --------

function section(title: string): { el: HTMLElement; body: HTMLElement } {
  const label = h(
    "div",
    {
      class:
        "px-2.5 pt-1.5 pb-0.5 text-[9px] uppercase tracking-[0.08em] text-chat-foreground/30 select-none",
    },
    title,
  );
  const body = h("div", { class: "px-2.5 pb-1.5 flex flex-col gap-[3px]" });
  const el = h(
    "div",
    { class: "border-b border-chat-border last:border-0" },
    label,
    body,
  );
  return { el, body };
}

function fmt_input_value(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function fmt_output(o: unknown): string {
  if (o == null) return "";
  if (typeof o === "string") return o;
  if (typeof o === "object") {
    const obj = { ...(o as Record<string, unknown>) };
    // "success: true" alongside real data is noise; drop it.
    if ("success" in obj && Object.keys(obj).length > 1) delete obj.success;
    if (obj.success === true && Object.keys(obj).length === 1) return "Done";
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(o);
    }
  }
  return String(o);
}

function default_body(t: Tool): HTMLElement {
  const wrapper = h("div", {
    class: "mt-1 rounded-[6px] border border-chat-border overflow-hidden",
  });

  const input = (t.input ?? {}) as Record<string, unknown>;
  const keys = Object.keys(input).filter((k) => input[k] !== undefined);
  if (keys.length) {
    const s = section("Input");
    for (const k of keys) {
      const row = h(
        "div",
        { class: "flex items-baseline gap-2 min-w-0" },
        h(
          "span",
          {
            class:
              "text-[10px] font-mono text-chat-foreground/35 shrink-0 select-none",
          },
          k,
        ),
        h(
          "span",
          {
            class:
              "text-[10.5px] font-mono text-chat-foreground/70 break-all min-w-0",
          },
          fmt_input_value(input[k]),
        ),
      );
      s.body.appendChild(row);
    }
    wrapper.appendChild(s.el);
  }

  const has_output = t.output != null && t.output !== "null";
  if (has_output) {
    const err =
      typeof t.output === "object" && t.output
        ? (t.output as Record<string, unknown>).error
        : undefined;
    const s = section("Output");
    const block = h("div", {
      class: cn(
        "font-mono text-[10.5px] whitespace-pre-wrap break-all max-h-[220px] overflow-y-auto",
        err ? "text-red-400/80" : "text-chat-foreground/60",
      ),
    });
    block.textContent = err ? String(err) : fmt_output(t.output);
    s.body.appendChild(block);
    wrapper.appendChild(s.el);
  }

  if (!keys.length && !has_output) {
    wrapper.appendChild(
      h(
        "div",
        {
          class: "px-2.5 py-1.5 text-[10px] text-chat-foreground/30 select-none",
        },
        "No details",
      ),
    );
  }

  return wrapper;
}

export function ChatToolChip(
  t: Tool,
  // permissionRequired: Permission[],
  // session_id?: string,
) {
  const default_expanded =
    t.tool === "WriteFileTool" || t.tool === "FileEditTool";
  let expanded = default_expanded;

  const pending: PendingOpts | undefined = undefined;

  const body_el = render_body(t, pending);
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
        class: "text-[11px] text-chat-foreground/55 font-medium shrink-0",
      });
      s.textContent = tool_label(t.tool);
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
