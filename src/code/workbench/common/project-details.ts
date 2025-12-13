import { dispatch } from "./store/store.js";
import { update_project_details } from "./store/slice.js";
import { IProjectDetails } from "../workbench.types.js";
import { runCommand } from "./process.js";
import {
  hideBox,
  showLoadingBox,
} from "../../platform/messagebox/common/messagebox.js";
import { addInformation, removeInformation } from "./titlebar.js";

function sendEvent() {
  const menuEvent = new CustomEvent(
    "workbench.workspace.virtual.env.complete",
    {
      detail: { action: "detaitls" },
    }
  );
  document.dispatchEvent(menuEvent);
}

async function _init() {
  const project_details = (await window.ipc.invoke(
    "workbench.workspace.details"
  )) as IProjectDetails;

  if (!project_details) return;

  if (
    project_details.venv?.path &&
    !window.fs.exists(project_details.venv?.path)
  ) {
    const path = window.path.join([project_details.path, ".venv"]);
    const command = "python";
    const args = ["-m", "venv", path];

    const loadingBox = showLoadingBox(
      "Making virtual environment",
      "Virtual enviornment is being created..."
    );

    const information = addInformation("Creating virtual env");

    runCommand(
      command,
      args,
      () => {
        hideBox(loadingBox);
        removeInformation(information);
        sendEvent();
      },
      () => {}
    );
  } else {
    sendEvent();
  }

  dispatch(update_project_details(project_details));

  window.fs.watchFile(
    window.path.join([project_details.path, ".meridia", "editor.json"]),
    { persistent: true, interval: 1000 },
    async () => {
      const project_details = (await window.ipc.invoke(
        "workbench.workspace.details"
      )) as IProjectDetails;

      if (!project_details) return;

      dispatch(update_project_details(project_details));
    }
  );
}

_init();
