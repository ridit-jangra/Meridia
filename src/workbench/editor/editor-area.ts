import { IWorkspace } from "../../../shared/types/workspace.types";
import { editors_registry } from "../../core/registry";
import { get_file_extension } from "../../services/editor/editor.helper";
import { image_editor } from "../../services/editor/editors/editor.image";
import { monaco_editor } from "../../services/editor/editors/editor.monaco";
import { update_tabs } from "../../services/state/slices/editor.slice";
import { store } from "../../services/state/store";
import { h, ScrollArea } from "../../ui";
import { EditorTabs } from "./editor-tabs";

export function EditorArea() {
  const el = h("div", {
    class: "flex flex-col h-full min-h-0 bg-panel-background",
  });

  const tabs_ui = EditorTabs();

  const scroll = ScrollArea({ class: "flex-1 min-h-0" });
  scroll.inner.classList.add("editor-area", "h-full");

  const get_active = () => store.getState().editor.tabs.find((v) => v.active);

  const get_editors_unique = () =>
    Array.from(new Set(Object.values(editors_registry)));

  let is_initialized = false;
  let last_active_path = "";
  let saving = false;
  let queued_tabs: any = null;

  const mount_panel = async () => {
    const key = get_active();
    const editors = get_editors_unique();

    if (!key) {
      editors.forEach((e) => e.set_visible(false));
      return;
    }

    if (key.file_path === last_active_path) return;
    last_active_path = key.file_path;

    const extension = get_file_extension(key.file_path);
    let editor = editors_registry[extension] ?? editors_registry["ts"];

    editors.forEach((e) => e.set_visible(false));

    editor.set_visible(true);

    const existing_model = editor.get_model(key.file_path);

    if (existing_model) {
      editor.set_model_active(key.file_path, key.tab_status === "NEW");
      return;
    }

    const model = await editor.create_model(key.file_path);
    editor.add_model(model);
    editor.set_model_active(key.file_path, key.tab_status === "NEW");
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

      console.log("updating", updates);

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

    void mount_panel();

    if (!is_initialized) {
      prev_tabs_ref = tabs;
      return;
    }

    if (tabs === prev_tabs_ref) return;
    prev_tabs_ref = tabs;

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
