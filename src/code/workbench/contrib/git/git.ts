import { git_events } from "../../../platform/events/git.events";
import { Button } from "../../browser/parts/components/button";
import { lucide } from "../../browser/parts/components/icon";
import { Input } from "../../browser/parts/components/input";
import { VirtualList } from "../../browser/parts/components/virtual/virtual-list";
import { h } from "../core/dom/h";
import { cn } from "../core/utils/cn";
import { initRepo, isRepo } from "./utils";
import {
  GitStatus,
  GitFileStatus,
} from "../../../../../shared/types/git.types";
import { open_editor_tab } from "../../../editor/editor.helper";

const ROW_HEIGHT = 26;

const GIT_LABELS: Record<string, string> = { "?": "U" };
const GIT_COLORS: Record<string, string> = {
  M: "--git-modified-foreground",
  A: "--git-staged-foreground",
  D: "--git-removed-foreground",
  "?": "--git-untracked-foreground",
};

const active_cls =
  "bg-explorer-item-active-background text-explorer-item-active-foreground";
const passive_cls =
  "text-explorer-foreground hover:bg-explorer-item-hover-background hover:text-explorer-item-hover-foreground";

function file_status_code(f: GitFileStatus): string {
  return f.index.trim() || f.working_dir.trim() || "?";
}

function file_display_name(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

const LoadingBar = () => {
  const el = h("div", {
    class:
      "absolute top-0 left-0 right-0 h-[2px] z-10 pointer-events-none overflow-hidden",
    style: "display:none",
  });
  el.appendChild(
    h("div", { class: "h-full w-[35%] bg-loader-foreground animate-loading" }),
  );
  git_events.on("start-loading", (timeout?: number, delay?: number) => {
    const show = () => (el.style.display = "block");
    const hide = () => (el.style.display = "none");
    delay ? setTimeout(show, delay) : show();
    if (timeout) setTimeout(hide, timeout);
  });
  git_events.on("stop-loading", (delay?: number) =>
    delay
      ? setTimeout(() => (el.style.display = "none"), delay)
      : (el.style.display = "none"),
  );
  return el;
};

const EmptyState = () =>
  h(
    "div",
    {
      class:
        "flex flex-col items-center justify-between w-full h-full px-4 flex-1",
    },
    h(
      "span",
      { class: "mt-4 w-full min-w-0 truncate text-center" },
      "Not a git repository.",
    ),
    h(
      "div",
      { class: "flex flex-col items-center gap-1.5 w-full" },
      Button("Init repository", {
        variant: "default",
        class: "w-full",
        onClick: async () => await initRepo(),
      }),
    ),
    h("div", {}),
  );

function render_file_row(
  f: GitFileStatus,
  selected: { path: string },
  list: ReturnType<typeof VirtualList>,
): HTMLElement {
  const code = file_status_code(f);
  const css_var = GIT_COLORS[code] ? `var(${GIT_COLORS[code]})` : "";
  const badge_label = GIT_LABELS[code] ?? code;
  const is_active = selected.path === f.path;

  const badge = h("span", {
    "data-git-badge": "1",
    style: `font-size:12px;font-weight:1000;margin-right:6px;flex-shrink:0;color:${css_var}`,
  });
  badge.textContent = badge_label;

  const label = h(
    "span",
    { class: "truncate font-normal", style: css_var ? `color:${css_var}` : "" },
    file_display_name(f.path),
  );

  const left = h("div", { class: "ml-2 flex items-center min-w-0" }, label);

  const row_el = h(
    "div",
    {
      "data-row-id": f.path,
      class: cn(
        "relative flex items-center justify-between select-none cursor-pointer text-[13px] px-1 py-2",
        is_active ? active_cls : passive_cls,
      ),
      tooltip: { text: f.path, delay: 200 },
      on: {
        click: async () => {
          const root = await window.workspace.get_current_workspace_path();
          const abs = root ? `${root}/${f.path}` : f.path;
          open_editor_tab(abs, "EDITOR_DIFF");
        },
      },
    },
    left,
    badge,
  );

  row_el.addEventListener("click", () => {
    const prev = list.layer.querySelector<HTMLElement>(
      `[data-row-id="${CSS.escape(selected.path)}"]`,
    );
    if (prev) {
      prev.className = prev.className
        .replace(active_cls, "")
        .trim()
        .concat(" ", passive_cls)
        .trim();
    }

    selected.path = f.path;

    row_el.className = row_el.className
      .replace(passive_cls, "")
      .trim()
      .concat(" ", active_cls)
      .trim();
  });

  return row_el;
}

const RepoState = () => {
  let status: GitStatus | null = null;
  const selected = { path: "" };

  const message_input = Input({ placeholder: "Message", type: "text" });

  const commit_btn = Button(
    h(
      "span",
      {
        class: "flex items-center gap-1",
        tooltip: { text: "Commit changes" },
      },
      lucide("check"),
      "Commit",
    ),
    {
      onClick: async () => {
        const msg = (message_input.el as HTMLInputElement).value.trim();
        if (!msg || !status?.files.length) return;
        const path = await window.workspace.get_current_workspace_path();
        if (!path) return;
        await window.git.commit(path, msg);
        (message_input.el as HTMLInputElement).value = "";
        sync_commit_btn();
      },
    },
  );

  const sync_commit_btn = () => {
    const msg = (message_input.el as HTMLInputElement).value.trim();
    (commit_btn as HTMLButtonElement).disabled = !msg || !status?.files.length;
  };

  message_input.el.addEventListener("input", sync_commit_btn);

  const branch_label = h("span", {
    class: "text-xs text-muted-foreground truncate flex items-center gap-1",
  });

  const changes_count = h(
    "p",
    { class: "text-sm font-medium px-1 px-2 mb-2" },
    "Changes",
  );

  let list: ReturnType<typeof VirtualList<GitFileStatus>>;
  list = VirtualList<GitFileStatus>({
    items: [],
    itemHeight: ROW_HEIGHT,
    height: "100%",
    class: "min-h-0 min-w-0 overflow-hidden flex-1",
    overscan: 4,
    cache: false,
    key: (f) => f.path,
    render: (f): HTMLElement => render_file_row(f, selected, list),
  });

  const refresh_ui = () => {
    branch_label.textContent = "";
    if (status?.branch) {
      branch_label.appendChild(lucide("git-branch"));
      branch_label.appendChild(document.createTextNode(status.branch));
      if (status.ahead)
        branch_label.appendChild(document.createTextNode(` ↑${status.ahead}`));
      if (status.behind)
        branch_label.appendChild(document.createTextNode(` ↓${status.behind}`));
    }

    const files = status?.files ?? [];

    changes_count.textContent =
      files.length === 0 ? "No changes" : `Changes (${files.length})`;

    selected.path = "";
    list.update_rows(files);

    sync_commit_btn();
  };

  git_events.on("refresh-status", (s: GitStatus) => {
    status = s;
    refresh_ui();
    console.log("new git status", s);
  });

  refresh_ui();

  return h(
    "div",
    {
      class: "flex flex-col w-full h-full min-h-0 gap-2",
    },

    h(
      "div",
      { class: "flex flex-col gap-2 px-4 pt-4 flex-shrink-0" },
      branch_label,
      message_input.el,
      commit_btn,
    ),

    h(
      "div",
      { class: "flex flex-col min-h-0 flex-1 mt-2" },
      changes_count,
      list.el,
    ),
  );
};

export async function Git() {
  const content = h("div", { class: "h-full w-full pt-[2px]" });
  content.appendChild((await isRepo()) ? RepoState() : EmptyState());

  const el = h("div", { class: cn("h-full w-full relative overflow-hidden") });
  el.append(LoadingBar(), content);

  git_events.on("initUi", async () => {
    content.innerHTML = "";
    content.appendChild((await isRepo()) ? RepoState() : EmptyState());
  });

  return el;
}
