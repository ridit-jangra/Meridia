import { dispatch } from "./store/store.js";
import { update_project_details } from "./store/slice.js";
import { IProjectDetails } from "../workbench.types.js";

async function _init() {
  const project_details = (await window.ipc.invoke(
    "workbench.workspace.details"
  )) as IProjectDetails;

  if (!project_details) return;

  dispatch(update_project_details(project_details));
}

_init();
