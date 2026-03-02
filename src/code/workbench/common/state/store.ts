import { configureStore } from "@reduxjs/toolkit";
import layoutReducer from "./slices/layout.slice";
import explorerReducer from "./slices/explorer.slice";
import editorReducer from "./slices/editor.slice";

export const store = configureStore({
  reducer: {
    layout: layoutReducer,
    explorer: explorerReducer,
    editor: editorReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
