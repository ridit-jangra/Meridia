import * as Diff from "diff";
import hljs from "highlight.js";
import { h } from "../../../../contrib/core/dom/h";

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

function highlight_line(line: string, lang: string): string {
  try {
    return hljs.highlight(line, { language: lang }).value;
  } catch {
    return hljs.highlight(line, { language: "plaintext" }).value;
  }
}

export function ChatDiffView(opts: {
  path: string;
  prevContent: string;
  newContent: string;
  onAccept?: () => void;
  onReject?: () => void;
}): { el: HTMLElement } {
  const lang = lang_from_path(opts.path);
  const safe_lang = hljs.getLanguage(lang) ? lang : "plaintext";

  const changes = Diff.diffLines(opts.prevContent, opts.newContent);

  const pre_el = h("pre", {
    class: "m-0 bg-transparent overflow-x-auto write-code",
  });

  const code_el = h("code", {
    class: `hljs language-${safe_lang} block text-[11px] font-mono leading-relaxed`,
    style: "background:transparent;padding:0.6em 0",
  });

  for (const change of changes) {
    const raw = change.value.split("\n");
    const lines = raw[raw.length - 1] === "" ? raw.slice(0, -1) : raw;
    const is_added = change.added ?? false;
    const is_removed = change.removed ?? false;

    for (const line of lines) {
      const span = document.createElement("span");
      span.style.display = "block";
      span.style.paddingLeft = "0.75em";
      span.style.paddingRight = "0.75em";

      if (is_added) {
        span.style.backgroundColor = "var(--chat-diff-added-background)";
        span.innerHTML = `<span style="opacity:0.6;user-select:none;margin-right:0.5em">+</span>${highlight_line(line, safe_lang)}`;
      } else if (is_removed) {
        span.style.backgroundColor = "var(--chat-diff-removed-background)";
        span.innerHTML = `<span style="opacity:0.6;user-select:none;margin-right:0.5em">−</span>${highlight_line(line, safe_lang)}`;
      } else {
        span.innerHTML = `<span style="opacity:0;user-select:none;margin-right:0.5em">·</span>${highlight_line(line, safe_lang)}`;
      }

      code_el.appendChild(span);
    }
  }

  pre_el.appendChild(code_el);

  const file_label = h("span", {
    class: "font-mono text-[10px] text-chat-foreground truncate select-none",
  });
  file_label.textContent = opts.path;

  const btn_row = h("div", { class: "flex items-center gap-1" });

  if (opts.onAccept) {
    const btn = h("button", {
      class:
        "h-5 px-2 text-[10px] rounded-[4px] bg-transparent border-0 cursor-pointer transition-colors",
      attrs: { type: "button" },
    });
    btn.textContent = "Accept";
    btn.style.color = "var(--chat-diff-added-foreground)";
    btn.addEventListener(
      "mouseenter",
      () => (btn.style.backgroundColor = "var(--chat-diff-added-background)"),
    );
    btn.addEventListener(
      "mouseleave",
      () => (btn.style.backgroundColor = "transparent"),
    );
    btn.addEventListener("click", opts.onAccept);
    btn_row.appendChild(btn);
  }

  if (opts.onReject) {
    const btn = h("button", {
      class:
        "h-5 px-2 text-[10px] rounded-[4px] bg-transparent border-0 cursor-pointer transition-colors",
      attrs: { type: "button" },
    });
    btn.textContent = "Reject";
    btn.style.color = "var(--chat-diff-removed-foreground)";
    btn.addEventListener(
      "mouseenter",
      () => (btn.style.backgroundColor = "var(--chat-diff-removed-background)"),
    );
    btn.addEventListener(
      "mouseleave",
      () => (btn.style.backgroundColor = "transparent"),
    );
    btn.addEventListener("click", opts.onReject);
    btn_row.appendChild(btn);
  }

  const header = h(
    "div",
    {
      class:
        "flex items-center justify-between px-2.5 py-1.5 border-b border-chat-border",
    },
    file_label,
    btn_row,
  );

  const el = h(
    "div",
    { class: "mt-1 rounded-[6px] overflow-hidden border border-chat-border" },
    header,
    pre_el,
  );

  return { el };
}
