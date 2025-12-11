import { dispatch } from "./store/store.js";
import { update_project_details } from "./store/slice.js";
import { IProjectDetails } from "../workbench.types.js";
import { select } from "./store/selector.js";

async function _init() {
  const project_details = (await window.ipc.invoke(
    "workbench.workspace.details"
  )) as IProjectDetails;
  dispatch(update_project_details(project_details));
  console.log(select((s) => s.main.project_details));
}

// watch(
//   (s) => s.main.editor_tabs,
//   (next) => window.storage.store("workbench.editor.files.tabs", next)
// );

_init();
