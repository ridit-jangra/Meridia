import {
  hideBox,
  showLoadingBox,
} from "../../../platform/messagebox/common/messagebox.js";
import { IProjectDetails } from "../../workbench.types.js";
import { runCommand } from "../process.js";
import { _init } from "../project-details.js";
import { select } from "../store/selector.js";
import { update_project_details } from "../store/slice.js";
import { dispatch } from "../store/store.js";
import { addInformation, removeInformation } from "../titlebar.js";

function sendCompleteEvent() {
  const menuEvent = new CustomEvent(
    "workbench.workspace.virtual.env.complete",
    {
      detail: { action: "detaitls" },
    },
  );
  document.dispatchEvent(menuEvent);
}

export function create_env(project_details: IProjectDetails) {
  if (
    project_details.venv?.path &&
    !window.fs.exists(project_details.venv?.path)
  ) {
    const path = window.path.join([project_details.path, ".venv"]);
    const command = "python";
    const args = ["-m", "venv", path];

    console.log("creating virtual env", command, ...args);

    const loadingBox = showLoadingBox(
      "Creating virtual environment",
      "Virtual enviornment is being created...",
    );

    const information = addInformation("Creating virtual env");

    runCommand(
      command,
      args,
      () => {
        hideBox(loadingBox);
        removeInformation(information);
        sendCompleteEvent();
      },
      () => {},
    );
  } else {
    sendCompleteEvent();
  }
}

async function update_env(venv_folder_name: string) {
  console.log("initiating env");

  const folder_structure = select((s) => s.main.folder_structure);
  if (!folder_structure?.uri) return;

  const baseFolder = folder_structure.uri;

  if (!window.fs.exists(window.path.join([baseFolder, venv_folder_name])))
    return;

  if (
    window.fs.exists(window.path.join([baseFolder, ".meridia", "editor.json"]))
  ) {
    const content = JSON.parse(
      window.fs.readFile(
        window.path.join([baseFolder, ".meridia", "editor.json"]),
      ),
    );
    console.log(content);
    if (!content["venv"] === null) return;
  }

  if (!window.fs.exists(window.path.join([baseFolder, ".meridia"]))) {
    window.fs.createFolder(window.path.join([baseFolder, ".meridia"]));
  }

  const meridiaFile = window.path.join([baseFolder, ".meridia", "editor.json"]);

  const venvPath = window.path.join([baseFolder, venv_folder_name]);

  let pythonPath: string;
  let activateCmd: string;

  if (window.node.platform === "win32") {
    pythonPath = window.path.join([venvPath, "Scripts", "python.exe"]);
    activateCmd = `${venv_folder_name}\\Scripts\\Activate.ps1`;
  } else {
    pythonPath = window.path.join([venvPath, "bin", "python"]);
    activateCmd = `source ${venv_folder_name}/bin/activate`;
  }

  const venvConfig = {
    path: venvPath,
    python: pythonPath,
    activate: activateCmd,
  };

  const config = {
    name: window.path.dirname(window.path.join([baseFolder, "file.py"])),
    path: baseFolder,
    type: "python",
    template: "python-empty",
    venv: venvConfig,
  };

  console.log("writing file", meridiaFile, JSON.stringify(config));

  window.fs.createFile(meridiaFile, JSON.stringify(config));

  const project_details = (await window.ipc.invoke(
    "workbench.workspace.details",
  )) as IProjectDetails;

  if (!project_details) return;

  dispatch(update_project_details(project_details));

  await _init();
}

window.ipc.on("virtual-env-update", (event: any, venv_folder_name: string) => {
  update_env(venv_folder_name);
});

setTimeout(() => {
  update_env(".venv");
}, 1000);
