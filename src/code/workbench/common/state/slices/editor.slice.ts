import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ITab } from "../../../../../types/editor.types";
import { get_base_name } from "../../../../platform/explorer/explorer.helper";
import {
  DockSide,
  EditorGroup,
  GridNode,
  grid_group_ids,
  new_group_id,
  remove_grid_group,
  set_grid_sizes,
  split_grid,
} from "../../../contrib/editor/group/grid";

interface EditorState {
  tabs: ITab[];
  groups: EditorGroup[];
  grid: GridNode;
  active_group_id: string;
}

const ROOT_GROUP = "g_root";

const initialState: EditorState = {
  tabs: [],
  groups: [{ id: ROOT_GROUP, tabs: [] }],
  grid: { type: "leaf", group_id: ROOT_GROUP },
  active_group_id: ROOT_GROUP,
};

function group_of(state: EditorState, id: string): EditorGroup | undefined {
  return state.groups.find((g) => g.id === id);
}

function mirror(state: EditorState) {
  const active = group_of(state, state.active_group_id);
  state.tabs = active ? active.tabs : [];
}

const editorSlice = createSlice({
  name: "editor",
  initialState,
  reducers: {
    update_tabs: (state, action: PayloadAction<ITab[]>) => {
      const active = group_of(state, state.active_group_id);
      if (active) active.tabs = action.payload;
      mirror(state);
    },

    set_group_tabs: (
      state,
      action: PayloadAction<{ group_id: string; tabs: ITab[] }>,
    ) => {
      const g = group_of(state, action.payload.group_id);
      if (g) g.tabs = action.payload.tabs;
      mirror(state);
    },

    rename_tab: (
      state,
      action: PayloadAction<{ old_path: string; new_path: string }>,
    ) => {
      const { old_path, new_path } = action.payload;
      for (const g of state.groups) {
        g.tabs = g.tabs.map((t) =>
          t.file_path === old_path
            ? { ...t, file_path: new_path, name: get_base_name(new_path) }
            : t,
        );
      }
      mirror(state);
    },

    set_active_group: (state, action: PayloadAction<string>) => {
      if (group_of(state, action.payload)) {
        state.active_group_id = action.payload;
        mirror(state);
      }
    },

    set_tab_touched: (
      state,
      action: PayloadAction<{ file_path: string; touched: boolean }>,
    ) => {
      const { file_path, touched } = action.payload;
      for (const g of state.groups) {
        g.tabs = g.tabs.map((t) =>
          t.file_path === file_path ? { ...t, is_touched: touched } : t,
        );
      }
      mirror(state);
    },

    split_group: (
      state,
      action: PayloadAction<{
        source_group_id: string;
        side: DockSide;
        tab?: ITab;
      }>,
    ) => {
      const { source_group_id, side, tab } = action.payload;
      if (!group_of(state, source_group_id)) return;

      const id = new_group_id();
      const seed: ITab[] = tab ? [{ ...tab, active: true }] : [];
      state.groups.push({ id, tabs: seed });
      state.grid = split_grid(state.grid, source_group_id, id, side);
      state.active_group_id = id;
      mirror(state);
    },

    close_group: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      if (state.groups.length <= 1) {
        const g = group_of(state, id);
        if (g) g.tabs = [];
        mirror(state);
        return;
      }
      const next_grid = remove_grid_group(state.grid, id);
      if (!next_grid) return;
      state.grid = next_grid;
      state.groups = state.groups.filter((g) => g.id !== id);
      if (state.active_group_id === id) {
        state.active_group_id = grid_group_ids(state.grid)[0];
      }
      mirror(state);
    },

    move_tab_to_group: (
      state,
      action: PayloadAction<{
        file_path: string;
        from_group_id: string;
        to_group_id: string;
        to_index?: number;
      }>,
    ) => {
      const { file_path, from_group_id, to_group_id, to_index } =
        action.payload;
      if (from_group_id === to_group_id) return;

      const from = group_of(state, from_group_id);
      const to = group_of(state, to_group_id);
      if (!from || !to) return;

      const idx = from.tabs.findIndex((t) => t.file_path === file_path);
      if (idx === -1) return;
      const [moved] = from.tabs.splice(idx, 1);

      from.tabs = from.tabs.map((t, i) => ({
        ...t,
        active: i === Math.max(0, idx - 1),
      }));

      const existing = to.tabs.findIndex((t) => t.file_path === file_path);
      if (existing !== -1) {
        to.tabs = to.tabs.map((t) => ({
          ...t,
          active: t.file_path === file_path,
        }));
      } else {
        const insert_at = to_index ?? to.tabs.length;
        const cleared = to.tabs.map((t) => ({ ...t, active: false }));
        cleared.splice(insert_at, 0, { ...moved, active: true });
        to.tabs = cleared;
      }

      state.active_group_id = to_group_id;

      if (from.tabs.length === 0 && state.groups.length > 1) {
        const next_grid = remove_grid_group(state.grid, from_group_id);
        if (next_grid) {
          state.grid = next_grid;
          state.groups = state.groups.filter((g) => g.id !== from_group_id);
        }
      }

      mirror(state);
    },

    resize_grid: (
      state,
      action: PayloadAction<{ path: number[]; sizes: number[] }>,
    ) => {
      state.grid = set_grid_sizes(
        state.grid,
        action.payload.path,
        action.payload.sizes,
      );
    },

    restore_editor_state: (
      state,
      action: PayloadAction<{
        groups: EditorGroup[];
        grid: GridNode;
        active_group_id: string;
      }>,
    ) => {
      const { groups, grid, active_group_id } = action.payload;
      if (!groups.length) return;
      state.groups = groups;
      state.grid = grid;
      state.active_group_id = group_of(state, active_group_id)
        ? active_group_id
        : groups[0].id;
      mirror(state);
    },
  },
});

export const {
  update_tabs,
  set_group_tabs,
  rename_tab,
  set_active_group,
  set_tab_touched,
  split_group,
  close_group,
  move_tab_to_group,
  resize_grid,
  restore_editor_state,
} = editorSlice.actions;

export default editorSlice.reducer;
