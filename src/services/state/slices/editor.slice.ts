import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ITab } from "../../editor/editor.types";

interface EditorState {
  tabs: ITab[];
}

const initialState: EditorState = {
  tabs: [],
};

const editorSlice = createSlice({
  name: "editor",
  initialState,
  reducers: {
    update_tabs: (state, action: PayloadAction<ITab[]>) => {
      state.tabs = action.payload;
    },
  },
});

export const { update_tabs } = editorSlice.actions;
export default editorSlice.reducer;
