import { configureStore } from "@reduxjs/toolkit";
import layoutReducer from "./slices/layout.slice";
// import panelReducer from "./slices/theme.slice";

export const store = configureStore({
  reducer: {
    layout: layoutReducer,
    // theme: themeReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
