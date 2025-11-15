import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import {
  IEditorTab,
  IFolderStructure,
  IMainState,
  IPanelState,
  IPreviewTab,
} from "../../workbench.types.js";

const initialState: IMainState = {
  editor_tabs: {} as IEditorTab[],
  preview_tabs: {} as IPreviewTab[],
  panel_state: {} as IPanelState,
  folder_structure: {} as IFolderStructure,
};

export const mainSlice = createSlice({
  name: "main",
  initialState,
  reducers: {
    update_editor_tabs: (state, action: PayloadAction<IEditorTab[]>) => {
      state.editor_tabs = action.payload;
    },
    update_preview_tabs: (state, action: PayloadAction<IPreviewTab[]>) => {
      state.preview_tabs = action.payload;
    },
    update_panel_state: (state, action: PayloadAction<IPanelState>) => {
      state.panel_state = action.payload;
    },
    update_folder_structure: (
      state,
      action: PayloadAction<IFolderStructure>
    ) => {
      state.folder_structure = action.payload;
    },
  },
});

export const {
  update_editor_tabs,
  update_preview_tabs,
  update_panel_state,
  update_folder_structure,
} = mainSlice.actions;

export default mainSlice.reducer;
