import { DevPanelTabs } from "../browser/workbench.parts/workbench.part.dev.panel/workbench.part.dev.panel.tabs.js";
import { Run } from "../browser/workbench.parts/workbench.part.dev.panel/workbench.part.dev.run.js";
import { addCommand } from "./workbench.command.js";
import { Editor } from "./workbench.editor/workbench.editor.js";
import { getStandalone } from "./workbench.standalone.js";
import { dispatch } from "./workbench.store/workbench.store.js";
import { select } from "./workbench.store/workbench.store.selector.js";
import { update_panel_state } from "./workbench.store/workbench.store.slice.js";

let _currentRunId = "";

addCommand("workbench.editor.run", async (_path: string) => {
  const _state = select((s) => s.main.panel_state);
  dispatch(update_panel_state({ ..._state, bottom: true }));
  const _run = getStandalone("run") as Run;
  const _editor = getStandalone("editor") as Editor;
  _editor._save(_path);
  const _tabs = getStandalone("dev-panel-tabs") as DevPanelTabs;
  await _tabs._set("run");
  const _id = await _run._run(_path);
  _currentRunId = _id!;
});

addCommand("workbench.editor.stop", async (_path: string) => {
  const _state = select((s) => s.main.panel_state);
  dispatch(update_panel_state({ ..._state, bottom: true }));
  const _run = getStandalone("run") as Run;
  const _tabs = getStandalone("dev-panel-tabs") as DevPanelTabs;
  await _tabs._set("run");
  _run._stop(_path, _currentRunId);
});
