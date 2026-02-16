import { update_tabs } from "../state/slices/editor.slice";
import { store } from "../state/store";
import { ITab } from "./editor.types";

export function open_editor_tab(file_path: string) {
  const current_tabs = store.getState().editor.tabs;
  const target = current_tabs.find((v) => v.file_path === file_path);

  if (target) {
    const updated_tabs = current_tabs.map((tab) => ({
      ...tab,
      active: tab.file_path === file_path,
    }));

    store.dispatch(update_tabs(updated_tabs));
    return;
  }

  const updated_tabs = current_tabs.map((tab) => ({
    ...tab,
    active: false,
  }));

  const new_tab: ITab = {
    file_path: file_path,
    name: file_path,
    active: true,
  };

  store.dispatch(update_tabs([...updated_tabs, new_tab]));
}

export function close_editor_tab(file_path: string) {
  const current_tabs = store.getState().editor.tabs;
  const filtered = current_tabs.filter((tab) => tab.file_path !== file_path);

  const was_active = current_tabs.find(
    (tab) => tab.file_path === file_path,
  )?.active;

  if (was_active && filtered.length > 0) {
    filtered[filtered.length - 1].active = true;
  }

  store.dispatch(update_tabs(filtered));
}

export function close_other_tabs(file_path: string) {
  const current_tabs = store.getState().editor.tabs;
  const keep_tab = current_tabs.find((tab) => tab.file_path === file_path);

  if (!keep_tab) return;

  store.dispatch(update_tabs([{ ...keep_tab, active: true }]));
}

export function close_all_tabs() {
  store.dispatch(update_tabs([]));
}

export function get_file_extension(file_path: string) {
  return file_path.slice(file_path.lastIndexOf(".") + 1);
}
