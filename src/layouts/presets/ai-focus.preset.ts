import { layout_engine } from "../layout.engine";
import { layout_preset } from "./presets.type";

export const ai_focus_preset: layout_preset = {
  id: "ai-focus",
  name: "ai focus",
  root: {
    type: "split",
    dir: "row",
    size: 0.7,
    a: {
      type: "split",
      dir: "col",
      size: 0.8,
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

layout_engine.store(ai_focus_preset);
