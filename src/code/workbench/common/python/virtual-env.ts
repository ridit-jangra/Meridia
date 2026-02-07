import { _init } from "../project-details.js";
import { select } from "../store/selector.js";

async function update_env(venv_folder_name: string) {
  console.log("initiating env ");

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

  await _init();
}

window.ipc.on("virtual-env-update", (event: any, venv_folder_name: string) => {
  console.log("got event virutal env", venv_folder_name);
  update_env(venv_folder_name);
});

setTimeout(() => {
  update_env(".venv");
}, 1000);
