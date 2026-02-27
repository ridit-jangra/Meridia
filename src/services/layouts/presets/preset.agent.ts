import { TLayoutPreset } from "./preset.types";

export const agent_preset: TLayoutPreset = {
  id: "agent",
  name: "agent",
  root: {
    type: "split",
    dir: "row",
    sizes: [20, 55, 25],
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
            label: "Explorer",
          },
          {
            id: "search",
            tooltip: "Search",
            shortcut_id: "toggleSearch",
            icon: "search",
            label: "Search",
          },
          {
            id: "git",
            tooltip: "Git",
            shortcut_id: "toggleGit",
            icon: "git-merge",
            label: "Git",
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
    ],
  },
};
