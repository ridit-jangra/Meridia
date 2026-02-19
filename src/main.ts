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
import { Command } from "./ui";
import { store } from "./services/state/store";
import { set_command_palette_open } from "./services/state/slices/layout.slice";
import { build_command_groups } from "./ui/components/command/command.groups";

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
