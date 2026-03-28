import { IWorkspace } from "../../../../../shared/types/workspace.types";
import { get_file_extension } from "../../../editor/editor.helper";
import { image_editor } from "../../../editor/editors/editor.image";
import { monaco_editor } from "../../../editor/editors/editor.monaco";
import { ScrollArea } from "../../browser/parts/components/scroll-area";
import { update_tabs } from "../../common/state/slices/editor.slice";
import { store } from "../../common/state/store";
import { h } from "../core/dom/h";
import { editors_registry } from "../core/registry";
import { EditorTabs } from "./editor-tabs";
import { editor_events } from "../../../platform/events/editor.events";

export function EditorArea() {
  const el = h("div", {
    class: "flex flex-col h-full min-h-0 bg-panel-background relative",
  });

  const tabs_ui = EditorTabs();

  const scroll = ScrollArea({
    class: "flex-1 min-h-0",
    innerClass: "editor-area h-full",
  });

  const get_active = () => store.getState().editor.tabs.find((v) => v.active);

  const get_editors_unique = () =>
    Array.from(new Set(Object.values(editors_registry)));

  let is_initialized = false;
  let last_active_path = "";
  let last_active_status = "";
  let saving = false;
  let queued_tabs: any = null;

  const mount_panel = async () => {
    const key = get_active();
    const editors = get_editors_unique();

    if (!key) {
      editors.forEach((e) => e.set_visible(false));
      return;
    }

    if (
      key.file_path === last_active_path &&
      key.tab_status === last_active_status
    )
      return;
    last_active_path = key.file_path;
    last_active_status = key.tab_status;

    const extension = get_file_extension(key.file_path);
    let editor = editors_registry[extension] ?? editors_registry["ts"];

    editors.forEach((e) => e.set_visible(false));

    const existing_model = editor.get_model(key.file_path);

    if (existing_model) {
      await editor.set_model_active(key.file_path, key.tab_status);
      return;
    }

    editor_events.emit("start-loading");
    const model = await editor.create_model(key.file_path);
    editor_events.emit("stop-loading");
    editor.add_model(model);
    await editor.set_model_active(key.file_path, key.tab_status);
  };

  const save_tabs_to_workspace = async (tabs: any) => {
    if (saving) {
      queued_tabs = tabs;
      return;
    }

    saving = true;

    try {
      const current_workspace_path =
        await window.workspace.get_current_workspace_path();
      if (!current_workspace_path) return;

      const current_workspace = await window.workspace.get_workspace(
        current_workspace_path,
      );
      if (!current_workspace) return;

      const updates: Partial<IWorkspace> = { editor_tabs: tabs };

      await window.workspace.update_workspace(current_workspace_path, updates);
    } finally {
      saving = false;

      if (queued_tabs) {
        const next = queued_tabs;
        queued_tabs = null;
        await save_tabs_to_workspace(next);
      }
    }
  };

  let prev_tabs_ref = store.getState().editor.tabs;

  const unsub = store.subscribe(() => {
    const { tabs } = store.getState().editor;

    if (tabs === prev_tabs_ref) return;
    prev_tabs_ref = tabs;

    void mount_panel();

    if (!is_initialized) return;

    void save_tabs_to_workspace(tabs);
  });

  const init = async () => {
    new image_editor();
    new monaco_editor();

    get_editors_unique().forEach((e) => e.mount(scroll.inner));

    const current_workspace_path =
      await window.workspace.get_current_workspace_path();
    if (!current_workspace_path) {
      is_initialized = true;
      await mount_panel();
      return;
    }

    const current_workspace = await window.workspace.get_workspace(
      current_workspace_path,
    );
    if (!current_workspace) {
      is_initialized = true;
      await mount_panel();
      return;
    }

    is_initialized = true;

    store.dispatch(update_tabs(current_workspace.editor_tabs ?? []));
    prev_tabs_ref = store.getState().editor.tabs;

    await mount_panel();
  };

  void init();

  el.appendChild(tabs_ui.el);
  el.appendChild(scroll.el);

  (el as any).destroy = () => {
    unsub();
    get_editors_unique().forEach((e) => e.set_visible(false));
  };

  return el;
}
