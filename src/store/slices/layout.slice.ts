import { TLayoutPreset } from "@/layouts/presets/preset.types";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface LayoutState {
  active_layout_id: string;
  active_panel_key: string;
  active_tab_key: string;
  presets: Record<string, TLayoutPreset>;
}

const initialState: LayoutState = {
  active_layout_id: "ide",
  active_panel_key: "explorer",
  active_tab_key: "terminal",
  presets: {},
};

const layoutSlice = createSlice({
  name: "layout",
  initialState,
  reducers: {
    set_active_layout_id(state, action: PayloadAction<string>) {
      state.active_layout_id = action.payload;
    },
    set_active_panel_key(state, action: PayloadAction<string>) {
      state.active_panel_key = action.payload;
    },
    set_active_tab_key(state, action: PayloadAction<string>) {
      state.active_tab_key = action.payload;
    },
    update_preset(state, action: PayloadAction<TLayoutPreset>) {
      state.presets[action.payload.id] = action.payload;
    },
  },
});

export const {
  set_active_layout_id,
  set_active_panel_key,
  set_active_tab_key,
  update_preset,
} = layoutSlice.actions;
export default layoutSlice.reducer;
