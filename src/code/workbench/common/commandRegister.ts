import { Editor } from "../../editor/standalone/standalone.js";
import { DevPanelTabs } from "../browser/parts/devPanel/tabs.js";
import { Run } from "../browser/parts/devPanel/run.js";
import { addCommand } from "./command.js";

import { getStandalone } from "./standalone.js";
import { dispatch } from "./store/store.js";
import { select } from "./store/selector.js";
import { update_panel_state } from "./store/slice.js";

let _currentRunId = "";

addCommand("workbench.editor.run", async (_path: string) => {
  const _state = select((s) => s.main.panel_state);
  dispatch(update_panel_state({ ..._state, bottom: true }));
  const _run = getStandalone("run") as Run;
  const _editor = getStandalone("editor") as Editor;
  _editor._save(_path);
  const _tabs = getStandalone("workbench.workspace.dev.tab") as DevPanelTabs;
  await _tabs._set("run");
  const _id = await _run._run(_path);
  _currentRunId = _id!;
});

addCommand("workbench.editor.stop", async (_path: string) => {
  const _state = select((s) => s.main.panel_state);
  dispatch(update_panel_state({ ..._state, bottom: true }));
  const _run = getStandalone("run") as Run;
  const _tabs = getStandalone("workbench.workspace.dev.tab") as DevPanelTabs;
  await _tabs._set("run");
  _run._stop(_path, _currentRunId);
});
