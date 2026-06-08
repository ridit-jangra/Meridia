import { h } from "../../core/dom/h";
import { store } from "../../../common/state/store";
import {
  close_group,
  set_group_tabs,
} from "../../../common/state/slices/editor.slice";
import { Explorer } from "../../explorer/explorer";
import { Git } from "../../git/git";
import { Search } from "../../search/search";
import { Chat } from "../../chat/chat";
import { TerminalPanel } from "../../terminal/terminal";
import { current_tab_drag } from "./dnd";
import { lucide } from "../../../browser/parts/components/icon";

export type MovableViewId =
  | "terminal"
  | "problems"
  | "explorer"
  | "git"
  | "search"
  | "ai_chat";

export interface ViewMeta {
  id: MovableViewId;
  label: string;
  icon: string;

  reveal_command?: string;
}

export const VIEW_META: Record<MovableViewId, ViewMeta> = {
  terminal: { id: "terminal", label: "Terminal", icon: "square-terminal" },
  problems: { id: "problems", label: "Problems", icon: "triangle-alert" },
  explorer: {
    id: "explorer",
    label: "Explorer",
    icon: "files",
    reveal_command: "layout.toggleExplorer",
  },
  git: {
    id: "git",
    label: "Source Control",
    icon: "git-merge",
    reveal_command: "layout.toggleGit",
  },
  search: {
    id: "search",
    label: "Search",
    icon: "search",
    reveal_command: "layout.toggleSearch",
  },
  ai_chat: { id: "ai_chat", label: "Chat", icon: "sparkles" },
};

export const MOVABLE_VIEW_IDS = Object.keys(VIEW_META) as MovableViewId[];

export function is_movable_view(id: string): id is MovableViewId {
  return id in VIEW_META;
}

export const VIEW_URI_PREFIX = "meridia://view/";

export function view_uri(id: MovableViewId): string {
  return VIEW_URI_PREFIX + id;
}

export function view_id_from_uri(uri: string): MovableViewId | null {
  if (!uri.startsWith(VIEW_URI_PREFIX)) return null;
  const id = uri.slice(VIEW_URI_PREFIX.length);
  return is_movable_view(id) ? id : null;
}

const elements = new Map<MovableViewId, HTMLElement>();

function build(id: MovableViewId): HTMLElement | Promise<HTMLElement> {
  switch (id) {
    case "terminal":
      return TerminalPanel().el;
    case "problems":
      return h("div", { class: "p-2 text-muted-foreground" }, "Problems view");
    case "explorer":
      return Explorer();
    case "git":
      return Git();
    case "search":
      return Search();
    case "ai_chat":
      return Chat();
  }
}

export function get_view_el(id: MovableViewId): HTMLElement {
  let el = elements.get(id);
  if (!el) {
    const wrapper = h("div", {
      class: "h-full w-full min-h-0 min-w-0 overflow-hidden",
    });
    const built = build(id);
    if (built instanceof Promise)
      built.then((node) => wrapper.appendChild(node));
    else wrapper.appendChild(built);
    el = wrapper;
    elements.set(id, el);
  }
  return el;
}

export function is_view_docked(id: MovableViewId): boolean {
  const uri = view_uri(id);
  return store
    .getState()
    .editor.groups.some((g) => g.tabs.some((t) => t.file_path === uri));
}

function bring_back(id: MovableViewId): void {
  const uri = view_uri(id);
  const ed = store.getState().editor;
  const owner = ed.groups.find((g) => g.tabs.some((t) => t.file_path === uri));
  if (!owner) return;

  const idx = owner.tabs.findIndex((t) => t.file_path === uri);
  const next = owner.tabs.filter((t) => t.file_path !== uri);

  if (next.length === 0) {
    if (ed.groups.length > 1) store.dispatch(close_group(owner.id));
    else store.dispatch(set_group_tabs({ group_id: owner.id, tabs: [] }));
    return;
  }

  const was_active = owner.tabs[idx]?.active;
  const na = Math.max(0, idx - 1);
  store.dispatch(
    set_group_tabs({
      group_id: owner.id,
      tabs: next.map((t, i) => ({
        ...t,
        active: was_active ? i === na : t.active,
      })),
    }),
  );
}

export function MovableViewSlot(id: MovableViewId): HTMLElement {
  const meta = VIEW_META[id];

  const placeholder = h(
    "button",
    {
      class:
        "h-full w-full flex flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground hover:text-foreground select-none cursor-pointer [&_svg]:w-6 [&_svg]:h-6",
      on: { click: () => bring_back(id) },
    },
    lucide(meta.icon),
    h(
      "span",
      { class: "text-[12px]" },
      `${meta.label} is in the editor area — click to bring it back.`,
    ),
  );

  placeholder.addEventListener("dragover", (e) => {
    const d = current_tab_drag();
    if (d && d.file_path === view_uri(id)) {
      e.preventDefault();
      e.dataTransfer!.dropEffect = "move";
    }
  });
  placeholder.addEventListener("drop", (e) => {
    const d = current_tab_drag();
    if (d && d.file_path === view_uri(id)) {
      e.preventDefault();
      bring_back(id);
    }
  });

  const el = h("div", {
    class: "h-full w-full min-h-0 min-w-0 overflow-hidden flex flex-col",
  });

  let prev_docked: boolean | null = null;

  const render = () => {
    const docked = is_view_docked(id);
    if (docked === prev_docked) return;
    prev_docked = docked;

    const view_el = get_view_el(id);
    if (docked) {
      if (view_el.parentElement === el) view_el.remove();
      if (placeholder.parentElement !== el) el.appendChild(placeholder);
    } else {
      if (placeholder.parentElement === el) placeholder.remove();
      if (view_el.parentElement !== el) el.appendChild(view_el);
    }
  };

  const unsub = store.subscribe(render);
  render();

  (el as HTMLElement & { destroy?: () => void }).destroy = () => {
    unsub();
    el.remove();
  };

  return el;
}
