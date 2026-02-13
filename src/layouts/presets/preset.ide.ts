import { layout_engine } from "../layout.engine";
import { layout_preset } from "./presets.type";

export const ide_preset: layout_preset = {
  id: "ide",
  name: "ide",
  root: {
    type: "split",
    dir: "row",
    size: 280,
    a: { type: "panel", id: "explorer", enabled: true },
    b: {
      type: "split",
      dir: "row",
      size: 0.75,
      a: {
        type: "split",
        dir: "col",
        size: 0.7,
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

layout_engine.store(ide_preset);
