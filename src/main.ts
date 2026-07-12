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
import { open_editor_tab } from "./code/editor/editor.helper";
import { store } from "./code/workbench/common/state/store";
import { set_command_palette_open } from "./code/workbench/common/state/slices/layout.slice";
import { focus_editor } from "./code/workbench/common/focus";
import { settings_service } from "./code/platform/settings/settings.service";
import { init_settings_apply } from "./code/platform/settings/settings.apply";

async function init() {
  const root = document.getElementById("app")!;

  await layout_engine.load();

  // layout_engine.reset_all();

  layout_engine.register_default_layout(ide_preset);
  layout_engine.register_default_layout(agent_preset);
  layout_engine.register_default_layout(editor_preset);

  await settings_service.load();
  init_settings_apply();

  const preset = layout_engine.get_layout(ide_preset.id)!;
  const lr = LayoutRenderer({ layout_preset: preset });
  root.appendChild(lr.el);

  shortcuts.bind(document);

  const palette = Command({
    groups: build_command_groups(),
    onOpenChange(open) {
      store.dispatch(set_command_palette_open(open));
      if (open === false) focus_editor();
    },
    open: false,
    fileProvider: async (query) => {
      const root = await window.workspace.get_current_workspace_path();
      if (!root) return [];
      return window.files.search_files(root, query, 40);
    },
    onOpenFile: (path) => open_editor_tab(path, "EDITOR_SINGLE"),
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

  window.ipc.send("build-menu", shortcuts.get_all_shortcuts());
  window.ipc.on("run-command", (_, id: string) => {
    shortcuts.run_shortcut(id);
  });
}

setTimeout(() => {
  init();
}, 10);
