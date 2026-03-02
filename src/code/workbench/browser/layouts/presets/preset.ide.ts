import { TLayoutPreset } from "../../../../../types/preset.types";

export const ide_preset: TLayoutPreset = {
  id: "ide",
  name: "ide",
  root: {
    type: "split",
    dir: "row",
    sizes: [20, 80],
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
          {
            type: "split",
            dir: "row",
            sizes: [70, 30],
            children: [
              { type: "panel", id: "editor", enabled: true },
              { type: "panel", id: "preview", enabled: false },
            ],
          },

          {
            type: "tabs",
            id: "bottom",
            tabs: [
              {
                id: "terminal",
                label: "Terminal",
                shortcut_id: "toggleTerminal",
                icon: "terminal",
              },
              {
                id: "problems",
                label: "Problems",
                shortcut_id: "toggleProblems",
                icon: "circle-alert",
              },
            ],
            active: "terminal",
            enabled: true,
          },
        ],
      },
      { type: "panel", id: "ai_chat", enabled: false },
      // { type: "panel", id: "ai_agent", enabled: true },
    ],
  },
};
