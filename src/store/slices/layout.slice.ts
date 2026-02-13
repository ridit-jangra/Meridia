import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface LayoutState {
  active: string;
  active_panel_key: string;
  active_tab_key: string;
}

const initialState: LayoutState = {
  active: "ide",
  active_panel_key: "explorer",
  active_tab_key: "terminal",
};

const layoutSlice = createSlice({
  name: "layout",
  initialState,
  reducers: {
    set_layout(state, action: PayloadAction<string>) {
      state.active = action.payload;
    },
    set_active_panel_key(state, action: PayloadAction<string>) {
      state.active_panel_key = action.payload;
    },
    set_active_tab_key(state, action: PayloadAction<string>) {
      state.active_tab_key = action.payload;
    },
  },
});

export const { set_layout, set_active_panel_key, set_active_tab_key } =
  layoutSlice.actions;
export default layoutSlice.reducer;
