import { shortcuts } from "./shortcut.service";
import { store } from "../store/store";
import {
  set_active_panel_key,
  set_active_tab_key,
  set_command_palette_open,
} from "../store/slices/layout.slice";
import {
  disable_node_at_path,
  enable_node_at_path,
  is_node_enabled_at_path,
  toggle_node_at_path,
} from "../../common/layout.helper";
import { layout_engine } from "../layouts/layout.engine";
import { update_layout } from "../../common/layout.helper";
import { debounce } from "../../common/utils";

shortcuts.register_command({
  id: "layout.toggleSearch",
  run: () => {
    update_layout(["a"], enable_node_at_path);
    store.dispatch(set_active_panel_key("search"));
  },
});

shortcuts.register_command({
  id: "layout.toggleExplorer",
  run: () => {
    update_layout(["a"], enable_node_at_path);
    store.dispatch(set_active_panel_key("explorer"));
  },
});

shortcuts.register_command({
  id: "layout.toggleGit",
  run: () => {
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
        new_root = disable_node_at_path(preset.root, ["b", "a", "b"]);
      } else {
        new_root = enable_node_at_path(preset.root, ["b", "a", "b"]);
      }

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
        new_root = disable_node_at_path(preset.root, ["b", "a", "b"]);
      } else {
        new_root = enable_node_at_path(preset.root, ["b", "a", "b"]);
      }

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
  id: "editor.newFile",
  run: () => console.log("new file"),
});
shortcuts.register_command({
  id: "editor.newFolder",
  run: () => console.log("new folder"),
});
shortcuts.register_command({
  id: "editor.openFile",
  run: () => console.log("open file"),
});
shortcuts.register_command({
  id: "editor.openFolder",
  run: () => console.log("open folder"),
});
shortcuts.register_command({
  id: "editor.save",
  run: () => console.log("save"),
});
shortcuts.register_command({
  id: "editor.saveAs",
  run: () => console.log("save as"),
});
shortcuts.register_command({
  id: "editor.saveAll",
  run: () => console.log("save all"),
});
shortcuts.register_command({
  id: "editor.close",
  run: () => console.log("close editor"),
});
shortcuts.register_command({
  id: "editor.closeFolder",
  run: () => console.log("close folder"),
});
shortcuts.register_command({
  id: "editor.undo",
  run: () => console.log("undo"),
});
shortcuts.register_command({
  id: "editor.redo",
  run: () => console.log("redo"),
});
shortcuts.register_command({
  id: "editor.cut",
  run: () => console.log("cut"),
});
shortcuts.register_command({
  id: "editor.copy",
  run: () => console.log("copy"),
});
shortcuts.register_command({
  id: "editor.paste",
  run: () => console.log("paste"),
});
shortcuts.register_command({
  id: "editor.find",
  run: () => console.log("find"),
});
shortcuts.register_command({
  id: "editor.replace",
  run: () => console.log("replace"),
});
shortcuts.register_command({
  id: "editor.findInFiles",
  run: () => console.log("find in files"),
});
shortcuts.register_command({
  id: "editor.selectAll",
  run: () => console.log("select all"),
});
shortcuts.register_command({
  id: "editor.expandSelection",
  run: () => console.log("expand selection"),
});
shortcuts.register_command({
  id: "editor.shrinkSelection",
  run: () => console.log("shrink selection"),
});
shortcuts.register_command({
  id: "editor.copyLineUp",
  run: () => console.log("copy line up"),
});
shortcuts.register_command({
  id: "editor.copyLineDown",
  run: () => console.log("copy line down"),
});
shortcuts.register_command({
  id: "editor.moveLineUp",
  run: () => console.log("move line up"),
});
shortcuts.register_command({
  id: "editor.moveLineDown",
  run: () => console.log("move line down"),
});
shortcuts.register_command({
  id: "editor.goToFile",
  run: () => console.log("go to file"),
});
shortcuts.register_command({
  id: "editor.goToLine",
  run: () => console.log("go to line"),
});
shortcuts.register_command({
  id: "editor.goToSymbol",
  run: () => console.log("go to symbol"),
});
shortcuts.register_command({
  id: "editor.goBack",
  run: () => console.log("go back"),
});
shortcuts.register_command({
  id: "editor.goForward",
  run: () => console.log("go forward"),
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
    id: "newFile",
    keys: "ctrl+n",
    command: "editor.newFile",
    scope: "app",
  },
  {
    id: "openFile",
    keys: "ctrl+o",
    command: "editor.openFile",
    scope: "app",
  },
  {
    id: "save",
    keys: "ctrl+s",
    command: "editor.save",
    scope: "app",
  },
  {
    id: "saveAs",
    keys: "ctrl+shift+s",
    command: "editor.saveAs",
    scope: "app",
  },
  {
    id: "saveAll",
    keys: "ctrl+k s",
    command: "editor.saveAll",
    scope: "app",
  },
  {
    id: "closeEditor",
    keys: "ctrl+w",
    command: "editor.close",
    scope: "app",
  },

  {
    id: "undo",
    keys: "ctrl+z",
    command: "editor.undo",
    scope: "app",
  },
  {
    id: "redo",
    keys: "ctrl+y",
    command: "editor.redo",
    scope: "app",
  },
  {
    id: "cut",
    keys: "ctrl+x",
    command: "editor.cut",
    scope: "app",
  },
  {
    id: "copy",
    keys: "ctrl+c",
    command: "editor.copy",
    scope: "app",
  },
  {
    id: "paste",
    keys: "ctrl+v",
    command: "editor.paste",
    scope: "app",
  },
  {
    id: "find",
    keys: "ctrl+f",
    command: "editor.find",
    scope: "app",
  },
  {
    id: "replace",
    keys: "ctrl+h",
    command: "editor.replace",
    scope: "app",
  },
  {
    id: "selectAll",
    keys: "ctrl+a",
    command: "editor.selectAll",
    scope: "app",
  },
  {
    id: "copyLineUp",
    keys: "shift+alt+up",
    command: "editor.copyLineUp",
    scope: "app",
  },
  {
    id: "copyLineDown",
    keys: "shift+alt+down",
    command: "editor.copyLineDown",
    scope: "app",
  },
  {
    id: "moveLineUp",
    keys: "alt+up",
    command: "editor.moveLineUp",
    scope: "app",
  },
  {
    id: "moveLineDown",
    keys: "alt+down",
    command: "editor.moveLineDown",
    scope: "app",
  },

  {
    id: "goToFile",
    keys: "ctrl+p",
    command: "editor.goToFile",
    scope: "app",
  },
  {
    id: "goToLine",
    keys: "ctrl+g",
    command: "editor.goToLine",
    scope: "app",
  },
  {
    id: "goToSymbol",
    keys: "ctrl+shift+o",
    command: "editor.goToSymbol",
    scope: "app",
  },
  {
    id: "goBack",
    keys: "alt+left",
    command: "editor.goBack",
    scope: "app",
  },
  {
    id: "goForward",
    keys: "alt+right",
    command: "editor.goForward",
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
