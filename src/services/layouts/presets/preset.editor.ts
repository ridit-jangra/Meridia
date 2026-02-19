import { TLayoutPreset } from "./preset.types";

export const editor_preset: TLayoutPreset = {
  id: "editor",
  name: "editor",
  root: {
    type: "split",
    dir: "row",
    sizes: [20, 60, 20],
    children: [
      {
        type: "activity-bar-panel",
        id: "left",
        enabled: false,
        panels: [
          {
            id: "explorer",
            tooltip: "Explorer",
            shortcut_id: "toggleExplorer",
            icon: "files",
          },
          {
            id: "search",
            tooltip: "Search",
            shortcut_id: "toggleSearch",
            icon: "search",
          },
          {
            id: "git",
            tooltip: "Git",
            shortcut_id: "toggleGit",
            icon: "git-merge",
          },
        ],
      },
      {
        type: "split",
        dir: "col",
        sizes: [70, 30],
        children: [
          { type: "panel", id: "editor", enabled: true },
          {
            type: "tabs",
            id: "bottom",
            tabs: [
              {
                id: "terminal",
                label: "Terminal",
                shortcut_id: "toggleTerminal",
              },
              {
                id: "problems",
                label: "Problems",
                shortcut_id: "toggleProblems",
              },
            ],
            active: "terminal",
            enabled: false,
          },
        ],
      },
      {
        type: "split",
        dir: "row",
        sizes: [50, 50],
        children: [
          { type: "panel", id: "ai_chat", enabled: false },
          { type: "panel", id: "ai_agent", enabled: true },
        ],
      },
    ],
  },
};
