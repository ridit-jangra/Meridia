import { editors_registry } from "../../core/registry";
import { get_file_extension } from "../../services/editor/editor.helper";
import { image_editor } from "../../services/editor/editors/editor.image";
import { monaco_editor } from "../../services/editor/editors/editor.monaco";
import { store } from "../../services/state/store";
import { h, ScrollArea } from "../../ui";
import { EditorTabs } from "./editor-tabs";

export function EditorArea() {
  const el = h("div", {
    class: "flex flex-col h-full min-h-0 bg-panel-background",
  });

  const tabs = EditorTabs();

  const scroll = ScrollArea({ class: "flex-1 min-h-0" });
  scroll.inner.classList.add("editor-area", "h-full");

  const get_active = () => store.getState().editor.tabs.find((v) => v.active);

  const getEditorsUnique = () =>
    Array.from(new Set(Object.values(editors_registry)));

  let is_initialized = false;
  let lastActivePath = "";

  const mountPanel = () => {
    const key = get_active();
    if (!key) return;

    if (key.file_path === lastActivePath) return;
    lastActivePath = key.file_path;

    const extension = get_file_extension(key.file_path);
    let editor = editors_registry[extension];

    const editors = getEditorsUnique();

    editors.forEach((e) => e.set_visible(false));

    if (!editor) {
      editor = editors_registry["ts"];
    }

    editor.set_visible(true);

    const existing_model = editor.get_model(key.file_path);

    if (existing_model) {
      editor.set_model_active(key.file_path);
      return;
    }

    const model = editor.create_model(key.file_path);
    editor.add_model(model);
    editor.set_model_active(key.file_path);
  };

  const init = async () => {
    new image_editor();
    new monaco_editor();

    getEditorsUnique().forEach((e) => e.mount(scroll.inner));

    is_initialized = true;
    mountPanel();
  };

  const unsub = store.subscribe(() => {
    const { tabs } = store.getState().editor;

    if (is_initialized && tabs) {
      // window.storage.set(ACTIVE_TAB_KEY, active_tab_key);
    }

    mountPanel();
  });

  init();

  el.appendChild(tabs.el);
  el.appendChild(scroll.el);

  (el as any).destroy = () => {
    unsub();
    getEditorsUnique().forEach((e) => e.set_visible(false));
  };

  return el;
}
