import { ITab } from "../../../../../types/editor.types";
import { store } from "../../../common/state/store";
import {
  close_group,
  move_tab_to_group,
  set_active_group,
  set_group_tabs,
  split_group,
} from "../../../common/state/slices/editor.slice";
import { DockSide } from "./grid";
import { TabDragPayload } from "./dnd";
import { MovableViewId, VIEW_META, view_uri } from "./view-host";
import { shortcuts } from "../../../common/shortcut/shortcut.service";

function group_tabs(group_id: string): ITab[] {
  return (
    store.getState().editor.groups.find((g) => g.id === group_id)?.tabs ?? []
  );
}

function find_tab(group_id: string, file_path: string): ITab | undefined {
  return group_tabs(group_id).find((t) => t.file_path === file_path);
}

function detach_tab(group_id: string, file_path: string): void {
  const tabs = group_tabs(group_id);
  const idx = tabs.findIndex((t) => t.file_path === file_path);
  if (idx === -1) return;

  const next = tabs.filter((_, i) => i !== idx);
  if (next.length === 0) {
    if (store.getState().editor.groups.length > 1)
      store.dispatch(close_group(group_id));
    else store.dispatch(set_group_tabs({ group_id, tabs: [] }));
    return;
  }
  const was_active = tabs[idx].active;
  const next_active = Math.max(0, idx - 1);
  store.dispatch(
    set_group_tabs({
      group_id,
      tabs: next.map((t, i) => ({
        ...t,
        active: was_active ? i === next_active : t.active,
      })),
    }),
  );
}

export function dock_into_group(
  payload: TabDragPayload,
  target_group_id: string,
): void {
  if (payload.from_group_id === target_group_id) {
    store.dispatch(set_active_group(target_group_id));
    return;
  }
  store.dispatch(
    move_tab_to_group({
      file_path: payload.file_path,
      from_group_id: payload.from_group_id,
      to_group_id: target_group_id,
    }),
  );
}

export function dock_to_edge(
  payload: TabDragPayload,
  target_group_id: string,
  side: DockSide,
): void {
  const tab = find_tab(payload.from_group_id, payload.file_path);
  if (!tab) return;

  store.dispatch(split_group({ source_group_id: target_group_id, side, tab }));

  detach_tab(payload.from_group_id, payload.file_path);
}

function view_tab(view_id: MovableViewId): ITab {
  return {
    file_path: view_uri(view_id),
    name: VIEW_META[view_id].label,
    active: true,
    tab_status: "EXISTS",
    tab_type: "VIEW",
    view_id,
  };
}

export function dock_view(
  view_id: MovableViewId,
  target_group_id: string,
  side?: DockSide,
): void {
  const uri = view_uri(view_id);
  const groups = store.getState().editor.groups;

  const owner = groups.find((g) => g.tabs.some((t) => t.file_path === uri));
  if (owner) {
    store.dispatch(
      set_group_tabs({
        group_id: owner.id,
        tabs: owner.tabs.map((t) => ({ ...t, active: t.file_path === uri })),
      }),
    );
    store.dispatch(set_active_group(owner.id));
    return;
  }

  if (side) {
    store.dispatch(
      split_group({
        source_group_id: target_group_id,
        side,
        tab: view_tab(view_id),
      }),
    );
    return;
  }

  const target = groups.find((g) => g.id === target_group_id);
  const tabs = (target?.tabs ?? []).map((t) => ({ ...t, active: false }));
  store.dispatch(
    set_group_tabs({
      group_id: target_group_id,
      tabs: [...tabs, view_tab(view_id)],
    }),
  );
  store.dispatch(set_active_group(target_group_id));
}

export function move_view_to_panel(view_id: MovableViewId): void {
  const uri = view_uri(view_id);
  const groups = store.getState().editor.groups;
  const owner = groups.find((g) => g.tabs.some((t) => t.file_path === uri));
  if (owner) detach_tab(owner.id, uri);

  const cmd = VIEW_META[view_id].reveal_command;
  if (cmd) shortcuts.run_shortcut(cmd);
}
