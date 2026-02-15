import { configureStore } from "@reduxjs/toolkit";
import layoutReducer from "./slices/layout.slice";
import explorerReducer from "./slices/explorer.slice";

export const store = configureStore({
  reducer: {
    layout: layoutReducer,
    explorer: explorerReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
