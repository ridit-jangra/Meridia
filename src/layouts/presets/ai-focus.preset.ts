import { layout_preset } from "./preset.types";

export const ai_focus_preset: layout_preset = {
  id: "ai-focus",
  name: "ai focus",
  root: {
    type: "split",
    dir: "row",
    size: 70,
    a: {
      type: "split",
      dir: "col",
      size: 80,
      a: { type: "panel", id: "editor" },
      b: {
        type: "tabs",
        id: "bottom",
        tabs: ["terminal", "problems"],
        active: "terminal",
      },
    },
    b: {
      type: "panel",
      id: "ai_chat",
    },
  },
};
