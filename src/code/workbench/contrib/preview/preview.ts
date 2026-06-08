import { h } from "../core/dom/h";
import { cn } from "../core/utils/cn";
import { codicon } from "../../browser/parts/components/icon";
import { Button } from "../../browser/parts/components/button";
import { Input } from "../../browser/parts/components/input";

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
  return Button(
    codicon(icon),
    {
      // class: cn(
      //   "shrink-0 p-1.5 rounded-[7px] cursor-pointer",
      //   "[&_svg]:w-4 [&_svg]:h-4 text-foreground/70",
      //   "hover:bg-view-tab-hover-background hover:text-foreground",
      //   "disabled:opacity-30 disabled:cursor-default disabled:hover:bg-transparent",
      // ),
      variant: "ghost",
      size: "sm",
      tooltip: { text: title, position: "bottom" },
      onClick: on_click,
    },
    // lucide(icon),
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
  const reload_btn = tool_button("refresh", "Reload", () => webview.reload());

  const url_input = Input({
    type: "text",
    placeholder: "Enter a URL (e.g. localhost:5137)",
    onKeyDown: (e) => {
      if (e.key !== "Enter") return;
      const url = normalize_url((e.target as HTMLInputElement).value);
      if (url) webview.loadURL(url);
    },
  }).el;

  url_input.value = DEFAULT_URL;

  const external_btn = tool_button("link-external", "Open in browser", () => {
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
