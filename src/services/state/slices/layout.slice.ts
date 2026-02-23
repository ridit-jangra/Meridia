import { TLayoutPreset } from "../../layouts/presets/preset.types";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface LayoutState {
  active_layout_id: string;
  active_panel_key: Record<string, string>;
  active_tab_key: string;
  command_palette_open: boolean;
  presets: Record<string, TLayoutPreset>;
}

const initialState: LayoutState = {
  active_layout_id: "ide",
  active_panel_key: { left: "explorer", right: "git" },
  active_tab_key: "terminal",
  command_palette_open: false,
  presets: {},
};

const layoutSlice = createSlice({
  name: "layout",
  initialState,
  reducers: {
    set_active_layout_id(state, action: PayloadAction<string>) {
      state.active_layout_id = action.payload;
    },
    set_active_panel_key(
      state,
      action: PayloadAction<{ key: string; value: string }>,
    ) {
      state.active_panel_key[action.payload.key] = action.payload.value;
    },
    set_active_tab_key(state, action: PayloadAction<string>) {
      state.active_tab_key = action.payload;
    },
    set_command_palette_open(state, action: PayloadAction<boolean>) {
      state.command_palette_open = action.payload;
    },
  },
});

export const {
  set_active_layout_id,
  set_active_panel_key,
  set_active_tab_key,
  // update_preset,
  set_command_palette_open,
} = layoutSlice.actions;
export default layoutSlice.reducer;
