import { h } from "../core/dom/h";
import { cn } from "../core/utils/cn";
import { lucide } from "../../browser/parts/components/icon";

const DEFAULT_URL = "http://localhost:5173";

type WebviewTag = HTMLElement & {
  src: string;
  loadURL(url: string): Promise<void>;
  getURL(): string;
  reload(): void;
  stop(): void;
  goBack(): void;
  goForward(): void;
  canGoBack(): boolean;
  canGoForward(): boolean;
};

function normalize_url(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  if (/^[a-z]+:\/\//i.test(value)) return value;
  if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/.*)?$/i.test(value)) {
    return `http://${value}`;
  }
  return `https://${value}`;
}

function tool_button(
  icon: string,
  title: string,
  on_click: () => void,
): HTMLElement {
  return h(
    "button",
    {
      class: cn(
        "shrink-0 p-1.5 rounded-[7px] cursor-pointer",
        "[&_svg]:w-4 [&_svg]:h-4 text-foreground/70",
        "hover:bg-view-tab-hover-background hover:text-foreground",
        "disabled:opacity-30 disabled:cursor-default disabled:hover:bg-transparent",
      ),
      tooltip: { text: title, position: "bottom" },
      on: { click: on_click },
    },
    lucide(icon),
  );
}

export function Preview(opts?: { class?: string }): HTMLElement {
  const webview = document.createElement("webview") as WebviewTag;
  webview.setAttribute("src", DEFAULT_URL);
  webview.setAttribute("allowpopups", "");
  webview.setAttribute("partition", "persist:preview");
  webview.style.cssText = "flex:1;width:100%;height:100%;border:0;";

  const back_btn = tool_button("arrow-left", "Back", () => {
    if (webview.canGoBack()) webview.goBack();
  });
  const forward_btn = tool_button("arrow-right", "Forward", () => {
    if (webview.canGoForward()) webview.goForward();
  });
  const reload_btn = tool_button("rotate-cw", "Reload", () => webview.reload());

  const url_input = h("input", {
    class: cn(
      "flex-1 min-w-0 px-2.5 py-1 rounded-[7px] text-[12px]",
      "bg-input-background text-input-foreground",
      "border border-workbench-border outline-none",
      "focus:border-focus-border",
    ),
    attrs: {
      type: "text",
      spellcheck: "false",
      placeholder: "Enter a URL (e.g. localhost:5173)",
    },
    on: {
      keydown: (e: KeyboardEvent) => {
        if (e.key !== "Enter") return;
        const url = normalize_url((e.target as HTMLInputElement).value);
        if (url) webview.loadURL(url);
      },
    },
  }) as HTMLInputElement;
  url_input.value = DEFAULT_URL;

  const external_btn = tool_button("external-link", "Open in browser", () => {
    const url = webview.getURL();
    if (url) window.open(url, "_blank");
  });

  const toolbar = h(
    "div",
    {
      class: cn(
        "flex items-center gap-1 p-2 shrink-0",
        "border-b border-workbench-border bg-panel-background",
      ),
    },
    back_btn,
    forward_btn,
    reload_btn,
    url_input,
    external_btn,
  );

  const viewport = h(
    "div",
    { class: "relative flex-1 min-h-0 min-w-0 bg-white" },
    webview,
  );

  const sync_nav = () => {
    (back_btn as HTMLButtonElement).disabled = !webview.canGoBack();
    (forward_btn as HTMLButtonElement).disabled = !webview.canGoForward();
  };

  const on_navigate = () => {
    if (document.activeElement !== url_input)
      url_input.value = webview.getURL();
    sync_nav();
  };

  webview.addEventListener("dom-ready", sync_nav);
  webview.addEventListener("did-navigate", on_navigate);
  webview.addEventListener("did-navigate-in-page", on_navigate);

  return h(
    "div",
    {
      class: cn("flex flex-col h-full min-h-0 min-w-0", opts?.class),
    },
    toolbar,
    viewport,
  );
}
