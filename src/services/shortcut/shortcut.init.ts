import { shortcuts } from "./shortcut.service";
import { store } from "../state/store";
import {
  set_active_panel_key,
  set_active_tab_key,
  set_command_palette_open,
} from "../state/slices/layout.slice";
import {
  disable_node_at_path,
  enable_node_at_path,
  is_node_enabled_at_path,
  is_node_enabled_at_path_active_preset,
  toggle_node_at_path,
} from "../layouts/layout.helper";
import { layout_engine } from "../layouts/layout.engine";
import { update_layout } from "../layouts/layout.helper";
import { debounce } from "../../core/utils/utils";
import {
  close_active_editor_tab,
  monaco,
  open_new_editor_tab,
} from "../editor/editor.helper";
import { terminal } from "../terminal/terminal.service";
import { terminal_events } from "../../events/terminal.events";
import { focus_terminal } from "../../common/focus";

shortcuts.register_command({
  id: "layout.toggleSearch",
  run: () => {
    if (!is_node_enabled_at_path_active_preset([0]))
      update_layout([0], enable_node_at_path);
    store.dispatch(set_active_panel_key({ key: "left", value: "search" }));
  },
});

shortcuts.register_command({
  id: "layout.toggleExplorer",
  run: () => {
    if (!is_node_enabled_at_path_active_preset([0]))
      update_layout([0], enable_node_at_path);
    store.dispatch(set_active_panel_key({ key: "left", value: "explorer" }));
  },
});

shortcuts.register_command({
  id: "layout.toggleGit",
  run: () => {
    if (!is_node_enabled_at_path_active_preset([0]))
      update_layout([0], enable_node_at_path);
    store.dispatch(set_active_panel_key({ key: "left", value: "git" }));
  },
});

shortcuts.register_command({
  id: "layout.toggleTerminal",
  run: () => {
    debounce(() => {
      const state = store.getState();
      const active_layout_id = state.layout.active_layout_id;
      const active_tab_key = state.layout.active_tab_key;
      const preset = layout_engine.get_layout(active_layout_id);

      if (!preset) return;

      let new_root;

      console.log("is terminal focus", terminal.is_focus());
      if (
        active_tab_key === "terminal" &&
        is_node_enabled_at_path(preset.root, [1, 1])
      ) {
        if (terminal.is_focus()) {
          if (is_node_enabled_at_path_active_preset([1, 1]))
            new_root = disable_node_at_path(preset.root, [1, 1]);
        } else {
          focus_terminal();
        }
      } else {
        if (!is_node_enabled_at_path_active_preset([1, 1]))
          new_root = enable_node_at_path(preset.root, [1, 1]);
      }

      if (new_root)
        layout_engine.update_preset(active_layout_id, {
          ...preset,
          root: new_root,
        });

      store.dispatch(set_active_tab_key("terminal"));

      terminal.refresh_active();
    });
  },
});

shortcuts.register_command({
  id: "layout.toggleProblems",
  run: () => {
    debounce(() => {
      const state = store.getState();
      const active_layout_id = state.layout.active_layout_id;
      const active_tab_key = state.layout.active_tab_key;
      const preset = layout_engine.get_layout(active_layout_id);

      if (!preset) return;

      let new_root;

      if (
        active_tab_key === "problems" &&
        is_node_enabled_at_path(preset.root, [1, 1])
      ) {
        if (is_node_enabled_at_path_active_preset([1, 1]))
          new_root = disable_node_at_path(preset.root, [1, 1]);
      } else {
        if (!is_node_enabled_at_path_active_preset([1, 1]))
          new_root = enable_node_at_path(preset.root, [1, 1]);
      }

      if (new_root)
        layout_engine.update_preset(active_layout_id, {
          ...preset,
          root: new_root,
        });

      store.dispatch(set_active_tab_key("problems"));
    });
  },
});

shortcuts.register_command({
  id: "layout.toggleBottomPanel",
  run: () => {
    const state = store.getState();
    const active_layout_id = state.layout.active_layout_id;
    const preset = layout_engine.get_layout(active_layout_id);
    if (!preset) return;

    const new_root = toggle_node_at_path(preset.root, [1, 1]);
    layout_engine.update_preset(active_layout_id, {
      ...preset,
      root: new_root,
    });
  },
});

shortcuts.register_command({
  id: "layout.togglePrimarySideBar",
  run: () => {
    update_layout([0], toggle_node_at_path);
  },
});

shortcuts.register_command({
  id: "layout.toggleSecondarySideBar",
  run: () => {
    update_layout([2], toggle_node_at_path);
  },
});

shortcuts.register_command({
  id: "terminal.new",
  run: () => console.log("new terminal"),
});
shortcuts.register_command({
  id: "terminal.split",
  run: () => console.log("split terminal"),
});
shortcuts.register_command({
  id: "terminal.clear",
  run: () => console.log("clear terminal"),
});
shortcuts.register_command({
  id: "terminal.kill",
  run: () => console.log("kill terminal"),
});

shortcuts.register_command({
  id: "app.preferences",
  run: () => console.log("preferences"),
});
shortcuts.register_command({
  id: "app.exit",
  run: () => console.log("exit"),
});
shortcuts.register_command({
  id: "app.commandPalette",
  run: () => {
    store.dispatch(set_command_palette_open(true));
  },
});
shortcuts.register_command({
  id: "app.zoomReset",
  run: () => console.log("reset zoom"),
});
shortcuts.register_command({
  id: "app.zoomIn",
  run: () => {
    window.ipc.invoke("workbench.zoom");
  },
});
shortcuts.register_command({
  id: "app.zoomOut",
  run: () => {
    window.ipc.invoke("workbench.zoomout");
  },
});
shortcuts.register_command({
  id: "app.toggleFullscreen",
  run: () => console.log("toggle fullscreen"),
});
shortcuts.register_command({
  id: "app.welcome",
  run: () => console.log("welcome"),
});
shortcuts.register_command({
  id: "app.documentation",
  run: () => console.log("documentation"),
});
shortcuts.register_command({
  id: "app.keyboardShortcuts",
  run: () => console.log("keyboard shortcuts"),
});
shortcuts.register_command({
  id: "app.checkUpdates",
  run: () => console.log("check updates"),
});
shortcuts.register_command({
  id: "app.about",
  run: () => console.log("about"),
});
shortcuts.register_command({
  id: "editor.closeTab",
  run: () => {
    close_active_editor_tab();
  },
});
shortcuts.register_command({
  id: "editor.close",
  run: () => {
    close_active_editor_tab();
  },
});
shortcuts.register_command({
  id: "editor.newFile",
  run: () => {
    open_new_editor_tab();
  },
});
shortcuts.register_command({
  id: "app.openFolder",
  run: () => {
    window.workspace.ask_update_workspace();
  },
});
shortcuts.register_command({
  id: "app.closeFolder",
  run: () => {},
});
shortcuts.register_command({
  id: "app.openSettings",
  run: () => {},
});
shortcuts.register_command({
  id: "terminal.new",
  run: () => {
    terminal_events.emit("newTab");
  },
});

shortcuts.register_shortcuts([
  {
    id: "toggleSearch",
    label: "Toggle Search",
    category: "Layout",
    keys: "ctrl+shift+f",
    command: "layout.toggleSearch",
    scope: "app",
  },
  {
    id: "toggleExplorer",
    label: "Toggle Explorer",
    category: "Layout",
    keys: "ctrl+shift+e",
    command: "layout.toggleExplorer",
    scope: "app",
  },
  {
    id: "toggleGit",
    label: "Toggle Git",
    category: "Layout",
    keys: "ctrl+shift+g",
    command: "layout.toggleGit",
    scope: "app",
  },
  {
    id: "toggleTerminal",
    label: "Toggle Terminal",
    category: "Layout",
    keys: "ctrl+`",
    command: "layout.toggleTerminal",
    scope: "app",
  },
  {
    id: "toggleProblems",
    label: "Toggle Problems",
    category: "Layout",
    keys: "ctrl+shift+m",
    command: "layout.toggleProblems",
    scope: "app",
  },
  {
    id: "togglePrimarySideBar",
    label: "Toggle Primary Sidebar",
    category: "Layout",
    keys: "ctrl+b",
    command: "layout.togglePrimarySideBar",
    scope: "app",
  },
  {
    id: "toggleBottomPanel",
    label: "Toggle Bottom Panel",
    category: "Layout",
    keys: "ctrl+j",
    command: "layout.toggleBottomPanel",
    scope: "app",
  },
  {
    id: "toggleSecondarySideBar",
    label: "Toggle Secondary Sidebar",
    category: "Layout",
    keys: "ctrl+alt+b",
    command: "layout.toggleSecondarySideBar",
    scope: "app",
  },
  {
    id: "commandPalette",
    label: "Show Command Palette",
    category: "App",
    keys: ["ctrl+shift+p", "f1"],
    command: "app.commandPalette",
    scope: "app",
  },
  {
    id: "zoomIn",
    label: "Zoom In",
    category: "App",
    keys: "ctrl+=",
    command: "app.zoomIn",
    scope: "app",
  },
  {
    id: "zoomOut",
    label: "Zoom Out",
    category: "App",
    keys: "ctrl+-",
    command: "app.zoomOut",
    scope: "app",
  },
  {
    id: "zoomReset",
    label: "Reset Zoom",
    category: "App",
    keys: "ctrl+0",
    command: "app.zoomReset",
    scope: "app",
  },
  {
    id: "toggleFullscreen",
    label: "Toggle Fullscreen",
    category: "App",
    keys: "f11",
    command: "app.toggleFullscreen",
    scope: "app",
  },
  {
    id: "closeTab",
    label: "Close Tab",
    category: "Editor",
    keys: "ctrl+w",
    command: "editor.closeTab",
    scope: "app",
  },
  {
    id: "close",
    label: "Close",
    category: "Editor",
    keys: "ctrl+f4",
    command: "editor.close",
    scope: "app",
  },
  {
    id: "newFile",
    label: "New Tab",
    category: "Editor",
    keys: "ctrl+n",
    command: "editor.newFile",
    scope: "app",
  },
  {
    id: "openFolder",
    label: "Open Folder",
    category: "App",
    keys: "ctrl+alt+o",
    command: "app.openFolder",
    scope: "app",
  },
  {
    id: "save",
    label: "Save",
    category: "Editor",
    keys: "ctrl+s",
    command: "editor.save",
    scope: "app",
  },
  {
    id: "saveAs",
    label: "Save As",
    category: "Editor",
    keys: "ctrl+shift+s",
    command: "editor.saveAs",
    scope: "app",
  },
  {
    id: "closeFolder",
    label: "Close Folder",
    category: "Editor",
    keys: "ctrl+m",
    command: "app.closeFolder",
    scope: "app",
  },
  {
    id: "openSettings",
    label: "Open Settings",
    category: "App",
    keys: "ctrl+,",
    command: "app.openSettings",
    scope: "app",
  },
  {
    id: "newTerminal",
    label: "New Terminal",
    category: "Terminal",
    keys: "ctrl+alt+t",
    command: "terminal.new",
    scope: "app",
  },
]);
