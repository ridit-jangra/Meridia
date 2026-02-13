import { layout_preset } from "./preset.types";

export const ide_preset: layout_preset = {
  id: "ide",
  name: "ide",
  root: {
    type: "split",
    dir: "row",
    size: 20,
    a: { type: "panel", id: "explorer", enabled: true },
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
          tabs: ["terminal", "problems"],
          active: "terminal",
          enabled: true,
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
