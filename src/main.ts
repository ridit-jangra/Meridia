import "./code/workbench/contrib/theme/theme.service";
import "./code/workbench/common/shortcut/shortcut.init";
import "./code/platform/explorer/explorer.service";

import "@vscode/codicons/dist/codicon.css";
import "./style.css";
import { build_command_groups } from "./code/workbench/browser/parts/components/command/command.groups";
import { layout_engine } from "./code/workbench/browser/layouts/layout.engine";
import { ide_preset } from "./code/workbench/browser/layouts/presets/preset.ide";
import { agent_preset } from "./code/workbench/browser/layouts/presets/preset.agent";
import { editor_preset } from "./code/workbench/browser/layouts/presets/preset.editor";
import { LayoutRenderer } from "./code/workbench/browser/layouts/layout.renderer";
import { shortcuts } from "./code/workbench/common/shortcut/shortcut.service";
import { Command } from "./code/workbench/browser/parts/components/command/command";
import { store } from "./code/workbench/common/state/store";
import { set_command_palette_open } from "./code/workbench/common/state/slices/layout.slice";

async function init() {
  const root = document.getElementById("app")!;

  await layout_engine.load();
  layout_engine.register_default_layout(ide_preset);
  layout_engine.register_default_layout(agent_preset);
  layout_engine.register_default_layout(editor_preset);

  // layout_engine.reset_all();

  const preset = layout_engine.get_layout("ide");
  const lr = LayoutRenderer({ layout_preset: preset });

  root.appendChild(lr.el);

  shortcuts.bind(document);

  const palette = Command({
    placeholder: "Search commands…",
    groups: build_command_groups(),
    onOpenChange(open) {
      store.dispatch(set_command_palette_open(open));
    },
    open: false,
  });

  store.subscribe(() => {
    const { command_palette_open } = store.getState().layout;

    if (command_palette_open) {
      palette.setGroups(build_command_groups());
      palette.open();
    } else {
      palette.close();
    }
  });
}

setTimeout(() => {
  init();
}, 10);
