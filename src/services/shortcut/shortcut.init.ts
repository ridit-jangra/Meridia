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

shortcuts.register_command({
  id: "layout.toggleSearch",
  run: () => {
    if (!is_node_enabled_at_path_active_preset(["a"]))
      update_layout(["a"], enable_node_at_path);
    store.dispatch(set_active_panel_key("search"));
  },
});

shortcuts.register_command({
  id: "layout.toggleExplorer",
  run: () => {
    if (!is_node_enabled_at_path_active_preset(["a"]))
      update_layout(["a"], enable_node_at_path);
    store.dispatch(set_active_panel_key("explorer"));
  },
});

shortcuts.register_command({
  id: "layout.toggleGit",
  run: () => {
    if (!is_node_enabled_at_path_active_preset(["a"]))
      update_layout(["a"], enable_node_at_path);
    store.dispatch(set_active_panel_key("git"));
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

      if (
        active_tab_key === "terminal" &&
        is_node_enabled_at_path(preset.root, ["b", "a", "b"])
      ) {
        if (is_node_enabled_at_path_active_preset(["b", "a", "b"]))
          new_root = disable_node_at_path(preset.root, ["b", "a", "b"]);
      } else {
        if (!is_node_enabled_at_path_active_preset(["b", "a", "b"]))
          new_root = enable_node_at_path(preset.root, ["b", "a", "b"]);
      }

      if (new_root)
        layout_engine.update_preset(active_layout_id, {
          ...preset,
          root: new_root,
        });

      store.dispatch(set_active_tab_key("terminal"));
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
        is_node_enabled_at_path(preset.root, ["b", "a", "b"])
      ) {
        if (is_node_enabled_at_path_active_preset(["b", "a", "b"]))
          new_root = disable_node_at_path(preset.root, ["b", "a", "b"]);
      } else {
        if (!is_node_enabled_at_path_active_preset(["b", "a", "b"]))
          new_root = enable_node_at_path(preset.root, ["b", "a", "b"]);
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
    update_layout(["b", "a", "b"], toggle_node_at_path);
  },
});

shortcuts.register_command({
  id: "layout.togglePrimarySideBar",
  run: () => {
    update_layout(["a"], toggle_node_at_path);
  },
});

shortcuts.register_command({
  id: "layout.toggleSecondarySideBar",
  run: () => {
    update_layout(["b", "b"], toggle_node_at_path);
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
  id: "app.zoomIn",
  run: () => console.log("zoom in"),
});
shortcuts.register_command({
  id: "app.zoomOut",
  run: () => console.log("zoom out"),
});
shortcuts.register_command({
  id: "app.zoomReset",
  run: () => console.log("reset zoom"),
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

shortcuts.register_shortcuts([
  {
    id: "toggleSearch",
    keys: "ctrl+shift+f",
    command: "layout.toggleSearch",
    scope: "app",
  },
  {
    id: "toggleExplorer",
    keys: "ctrl+shift+e",
    command: "layout.toggleExplorer",
    scope: "app",
  },
  {
    id: "toggleGit",
    keys: "ctrl+shift+g",
    command: "layout.toggleGit",
    scope: "app",
  },
  {
    id: "toggleTerminal",
    keys: "ctrl+`",
    command: "layout.toggleTerminal",
    scope: "app",
  },
  {
    id: "toggleProblems",
    keys: "ctrl+shift+m",
    command: "layout.toggleProblems",
    scope: "app",
  },
  {
    id: "togglePrimarySideBar",
    keys: "ctrl+b",
    command: "layout.togglePrimarySideBar",
    scope: "app",
  },
  {
    id: "toggleBottomPanel",
    keys: "ctrl+j",
    command: "layout.toggleBottomPanel",
    scope: "app",
  },
  {
    id: "toggleSecondarySideBar",
    keys: "ctrl+alt+b",
    command: "layout.toggleSecondarySideBar",
    scope: "app",
  },
  {
    id: "commandPalette",
    keys: "ctrl+shift+p",
    command: "app.commandPalette",
    scope: "app",
  },
  {
    id: "zoomIn",
    keys: "ctrl+=",
    command: "app.zoomIn",
    scope: "app",
  },
  {
    id: "zoomOut",
    keys: "ctrl+-",
    command: "app.zoomOut",
    scope: "app",
  },
  {
    id: "zoomReset",
    keys: "ctrl+0",
    command: "app.zoomReset",
    scope: "app",
  },
  {
    id: "toggleFullscreen",
    keys: "f11",
    command: "app.toggleFullscreen",
    scope: "app",
  },
]);
