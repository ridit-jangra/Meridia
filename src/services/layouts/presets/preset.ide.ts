import { TLayoutPreset } from "./preset.types";

export const ide_preset: TLayoutPreset = {
  id: "ide",
  name: "ide",
  root: {
    type: "split",
    dir: "row",
    size: 20,
    a: {
      type: "activity-bar-panel",
      panels: [
        {
          id: "explorer",
          tooltip: "Explorer",
          shortcut_id: "toggleExplorer",
          icon: "FilesIcon",
        },
        {
          id: "search",
          tooltip: "Search",
          shortcut_id: "toggleSearch",
          icon: "SearchIcon",
        },
        {
          id: "git",
          tooltip: "Git",
          shortcut_id: "toggleGit",
          icon: "GitMergeIcon",
        },
      ],
      enabled: true,
    },
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
      },
      b: {
        type: "panel",
        id: "ai_chat",
        enabled: false,
      },
    },
  },
};
