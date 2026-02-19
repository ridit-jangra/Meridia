import { TLayoutPreset } from "./preset.types";

export const ide_preset: TLayoutPreset = {
  id: "ide",
  name: "ide",
  root: {
    type: "split",
    dir: "row",
    sizes: [20, 55, 25],
    children: [
      {
        type: "activity-bar-panel",
        id: "left",
        enabled: true,
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
            enabled: true,
          },
        ],
      },
      { type: "panel", id: "ai_chat", enabled: true },
      { type: "panel", id: "ai_agent", enabled: true },
    ],
  },
};
