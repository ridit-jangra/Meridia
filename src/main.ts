import "./services/theme/theme.service";
import "./services/shortcut/shortcut.init";

import "@vscode/codicons/dist/codicon.css";
import "./style.css";
import { layout_engine } from "./services/layouts/layout.engine";
import { LayoutRenderer } from "./services/layouts/layout.renderer";
import { shortcuts } from "./services/shortcut/shortcut.service";
import { ide_preset } from "./services/layouts/presets/preset.ide";
import { agent_preset } from "./services/layouts/presets/preset.agent";
import { editor_preset } from "./services/layouts/presets/preset.editor";
import { Command, CommandGroup } from "./ui";
import { store } from "./services/state/store";
import { set_command_palette_open } from "./services/state/slices/layout.slice";

const root = document.getElementById("app")!;

await layout_engine.load();

layout_engine.register_default_layout(ide_preset);
layout_engine.register_default_layout(agent_preset);
layout_engine.register_default_layout(editor_preset);

const preset = layout_engine.get_layout("ide");
const lr = LayoutRenderer({ layout_preset: preset });

root.appendChild(lr.el);

const unbind = shortcuts.bind(document);

// layout_engine.reset_all();

// Define command groups with prefixes
const commandGroups: CommandGroup[] = [
  {
    id: "shortcuts",
    name: "Commands",
    prefix: ">",
    items: shortcuts.get_all_shortcuts(),
  },
  // You can add more groups here
  // {
  //   id: "files",
  //   name: "Go to File",
  //   prefix: "",
  //   items: [], // Your file list
  // },
  // {
  //   id: "symbols",
  //   name: "Go to Symbol",
  //   prefix: "@",
  //   items: [], // Your symbol list
  // },
  // {
  //   id: "lines",
  //   name: "Go to Line",
  //   prefix: ":",
  //   items: [], // Your line navigation
  // },
];

const palette = Command({
  placeholder: "Search commands…",
  groups: commandGroups,
  defaultGroup: "shortcuts",
  onOpenChange(open) {
    store.dispatch(set_command_palette_open(open));
  },
  open: false,
});

const unsub = store.subscribe(() => {
  const { command_palette_open } = store.getState().layout;

  if (command_palette_open) {
    palette.open();
  } else {
    palette.close();
  }
});
