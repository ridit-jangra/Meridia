import { h } from "../core/dom/h";
import { store } from "../../common/state/store";
import { Splitter } from "../../browser/parts/components/splitter/splitter";
import { GridNode, grid_group_ids } from "./group/grid";
import {
  close_group,
  resize_grid,
  restore_editor_state,
  set_tab_touched,
  update_tabs,
} from "../../common/state/slices/editor.slice";
import { GroupPane } from "./group/group-pane";
import { TabSwitcher } from "../../browser/parts/components/tab-switcher";
import { get_shared_model } from "./group/code-view";
import {
  open_editor_tab,
  update_editor_tab,
} from "../../../editor/editor.helper";
import { explorer } from "../../../platform/explorer/explorer.service";
import { editor_events } from "../../../platform/events/editor.events";
import { explorer_events } from "../../../platform/events/explorer.events";
import { shortcuts } from "../../common/shortcut/shortcut.service";
import { lsp_client } from "../../../editor/editor.monaco.lsp";
import { LSP_BRIDGE_PORT } from "../../../../../shared/lsp/lsp.constants";
import {
  EDITOR_ACTIVE_FILE,
  EDITOR_OPEN_FILE,
  EDITOR_SCROLL_TO_LINE,
} from "../../../../../shared/ipc/channels";
import { register_html_language } from "../../../editor/languages/html";
import { register_react_language } from "../../../editor/languages/react";
import { IWorkspace } from "../../../../../shared/types/workspace.types";
import { tab_type } from "../../../../types/editor.types";
import { settings_service } from "../../../platform/settings/settings.service";

import "../../../editor/editors/editor.monaco";

type Pane = ReturnType<typeof GroupPane>;

let services_started = false;

export function EditorGroups() {
  const panes = new Map<string, Pane>();
  let splitters: ReturnType<typeof Splitter>[] = [];

  const host = h("div", {
    class: "flex-1 min-h-0 min-w-0 overflow-hidden",
  });
  const root = h(
    "div",
    { class: "flex flex-col h-full min-h-0 bg-panel-background relative" },
    host,
  );

  const active_pane = (): Pane | undefined =>
    panes.get(store.getState().editor.active_group_id);

  const switcher = TabSwitcher();

  const on_keydown = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === "Tab" && !switcher.is_open()) {
      e.preventDefault();
      e.stopPropagation();
      const tabs = store.getState().editor.tabs;
      if (tabs.length > 0) switcher.open(tabs, 1);
    }
  };
  document.addEventListener("keydown", on_keydown, true);

  const relayout = () => panes.forEach((p) => p.layout());

  const get_pane = (group_id: string): Pane => {
    let p = panes.get(group_id);
    if (!p) {
      p = GroupPane(group_id);
      panes.set(group_id, p);
    }
    return p;
  };

  const render_node = (node: GridNode, path: number[]): HTMLElement => {
    if (node.type === "leaf") return get_pane(node.group_id).el;

    const dir = node.dir === "col" ? "vertical" : "horizontal";
    const total = node.children.length;
    const sizes = node.sizes ?? node.children.map(() => 100 / total);

    const splitter = Splitter({
      direction: dir,
      gutterSize: 2,
      panels: node.children.map((child, i) => ({
        id: String(i),
        size: sizes[i],
        minSize: 120,
        collapsible: false,
        el: render_node(child, [...path, i]),
      })),
      onResize: () => relayout(),
      onResizeEnd: (next) => {
        const updated = [...sizes];
        next.forEach(({ id, size }) => (updated[Number(id)] = size));
        store.dispatch(resize_grid({ path, sizes: updated }));
        requestAnimationFrame(relayout);
      },
    });
    splitters.push(splitter);
    return splitter.el;
  };

  const grid_shape = (n: GridNode): string =>
    n.type === "leaf"
      ? `L:${n.group_id}`
      : `S${n.dir}(${n.children.map(grid_shape).join(",")})`;

  let shape = "";

  const rerender = () => {
    const grid = store.getState().editor.grid;
    const next_shape = grid_shape(grid);
    if (next_shape === shape && host.firstChild) return;
    shape = next_shape;

    const live = new Set(grid_group_ids(grid));
    for (const [id, pane] of panes) {
      if (!live.has(id)) {
        pane.destroy();
        panes.delete(id);
      }
    }

    splitters.forEach((s) => s.destroy());
    splitters = [];
    host.innerHTML = "";
    host.appendChild(render_node(grid, []));
    requestAnimationFrame(relayout);
  };

  const start_services = () => {
    if (services_started) return;
    services_started = true;

    register_html_language();
    register_react_language();

    lsp_client.register({ languageId: "python", extensions: ["py"] });
    lsp_client.register({
      languageId: "typescript",
      extensions: ["ts", "js", "mjs", "mts"],
    });
    lsp_client.register({ languageId: "typescriptreact", extensions: ["tsx"] });
    lsp_client.register({ languageId: "javascriptreact", extensions: ["jsx"] });
    lsp_client.register({ languageId: "rust", extensions: ["rs"] });
    lsp_client.register({ languageId: "go", extensions: ["go"] });

    window.workspace.get_current_workspace_path().then((p) => {
      lsp_client.start(p ?? "C:\\", LSP_BRIDGE_PORT).catch(() => {});
    });

    editor_events.on("lsp-restart", async () => {
      lsp_client.dispose();
      const p = await window.workspace.get_current_workspace_path();
      await lsp_client.start(p ?? "C:\\", LSP_BRIDGE_PORT).catch(() => {});
    });

    window.ipc.on(
      EDITOR_OPEN_FILE,
      (_: unknown, path: string, type: tab_type) => open_editor_tab(path, type),
    );
    window.ipc.on(
      EDITOR_SCROLL_TO_LINE,
      (_: unknown, path: string, line: number) => {
        open_editor_tab(path, "EDITOR_SINGLE");
        requestAnimationFrame(() => {
          const inst = active_pane()?.code_view.instance;
          inst?.revealLineInCenter(line);
        });
      },
    );

    window.ipc.on(
      "workbench.explorer.change",
      async (_: unknown, uri: string) => {
        const entry = get_shared_model(uri);
        if (!entry) return;
        const groups = store.getState().editor.groups;
        const touched = groups.some((g) =>
          g.tabs.some((t) => t.file_path === uri && t.is_touched),
        );
        if (touched) return;
        let content: string;
        try {
          content = await explorer.actions.read_file(uri);
        } catch {
          return;
        }
        if (entry.model.getValue() === content) return;
        entry.model.setValue(content);
        store.dispatch(set_tab_touched({ file_path: uri, touched: false }));
      },
    );

    shortcuts.register_command({
      id: "editor.save",
      run: () => void save_active(),
    });
    shortcuts.register_command({
      id: "editor.saveAs",
      run: () => void save_active_as(),
    });
  };

  const save_active = async () => {
    const view = active_pane()?.code_view;
    const m = view?.active_model;
    if (!view || !m) return;
    const tab = store.getState().editor.tabs.find((t) => t.file_path === m.uri);
    if (!tab) return;
    if (tab.tab_status === "NEW") return void save_active_as();

    if (settings_service.get().editor_format_on_save) {
      await view.format_document();
    }

    editor_events.emit("start-loading");
    const res = await explorer.actions.create_file(m.uri, m.model.getValue());
    editor_events.emit("stop-loading");
    store.dispatch(set_tab_touched({ file_path: m.uri, touched: !res }));
  };

  const save_active_as = async () => {
    const m = active_pane()?.code_view.active_model;
    if (!m) return;
    editor_events.emit("start-loading");
    const res = await window.files.saveAs(m.model.getValue(), m.uri);
    editor_events.emit("stop-loading");
    if (res.cancel) return;
    update_editor_tab(m.uri, res.path);
    store.dispatch(set_tab_touched({ file_path: res.path, touched: false }));
  };

  let last_active_path: string | null = null;
  let last_active_group = "";

  const on_store = () => {
    {
      const ed = store.getState().editor;
      if (ed.groups.length > 1) {
        const empty = ed.groups.find((g) => g.tabs.length === 0);
        if (empty) {
          store.dispatch(close_group(empty.id));
          return;
        }
      }
    }

    rerender();

    const state = store.getState().editor;

    if (state.active_group_id !== last_active_group) {
      last_active_group = state.active_group_id;
      const pane = active_pane();
      pane?.code_view.emit_statusbar();
    }

    const active_tab = state.tabs.find((t) => t.active);
    const path = active_tab?.file_path ?? null;
    if (path && path !== last_active_path) {
      last_active_path = path;
      window.ipc.send(EDITOR_ACTIVE_FILE, path);
      explorer_events.emit("highlight", path);
    }

    if (is_initialized) schedule_save();
  };

  let is_initialized = false;
  let save_timer: number | null = null;
  let saving = false;

  const schedule_save = () => {
    if (save_timer) window.clearTimeout(save_timer);
    save_timer = window.setTimeout(() => void persist(), 400);
  };

  const persist = async () => {
    if (saving) return;
    saving = true;
    try {
      const wpath = await window.workspace.get_current_workspace_path();
      if (!wpath) return;
      const ws = await window.workspace.get_workspace(wpath);
      if (!ws) return;
      const { groups, grid, active_group_id, tabs } = store.getState().editor;
      const updates: Partial<IWorkspace> = {
        editor_layout: { groups, grid, active_group_id },
        editor_tabs: tabs,
      };
      await window.workspace.update_workspace(wpath, updates);
    } finally {
      saving = false;
    }
  };

  const init = async () => {
    start_services();

    const wpath = await window.workspace.get_current_workspace_path();
    if (wpath) {
      const ws = await window.workspace.get_workspace(wpath);
      if (ws?.editor_layout?.groups?.length) {
        store.dispatch(restore_editor_state(ws.editor_layout));
      } else if (ws?.editor_tabs?.length) {
        store.dispatch(update_tabs(ws.editor_tabs));
      }
    }

    is_initialized = true;
    rerender();
    requestAnimationFrame(relayout);
  };

  const unsub = store.subscribe(on_store);
  rerender();
  void init();

  (root as any).destroy = () => {
    unsub();
    document.removeEventListener("keydown", on_keydown, true);
    switcher.destroy();
    if (save_timer) window.clearTimeout(save_timer);
    splitters.forEach((s) => s.destroy());
    panes.forEach((p) => p.destroy());
    panes.clear();
  };

  return root;
}
