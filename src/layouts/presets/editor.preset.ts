import { TLayoutPreset } from "./preset.types";

export const editor_preset: TLayoutPreset = {
  id: "editor",
  name: "editor",
  root: {
    type: "split",
    dir: "row",
    size: 20,
    a: { type: "panel", id: "explorer", enabled: false },
    b: {
      type: "split",
      dir: "row",
      size: 75,
      a: {
        type: "split",
        dir: "col",
        size: 70,
        a: { type: "panel", id: "editor", enabled: true },
        b: {
          type: "tabs",
          id: "bottom",
          tabs: [
            { id: "terminal", label: "Terminal" },
            { id: "problems", label: "Problems" },
          ],
          active: "terminal",
          enabled: false,
        },
      },
      b: {
        type: "panel",
        id: "ai_chat",
        enabled: false,
      },
    },
  },
};
