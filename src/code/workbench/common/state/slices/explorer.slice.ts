import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { IFolderStructure } from "../../../../../../shared/types/explorer.types";

interface ExplorerState {
  folder_structure: IFolderStructure;
}

const initialState: ExplorerState = {
  folder_structure: {} as IFolderStructure,
};

const explorerSlice = createSlice({
  name: "explorer",
  initialState,
  reducers: {
    set_folder_structure: (state, action: PayloadAction<IFolderStructure>) => {
      state.folder_structure = action.payload;
    },
  },
});

export const { set_folder_structure } = explorerSlice.actions;
export default explorerSlice.reducer;
