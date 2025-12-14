import { IProjectDetails } from "../workbench.types.js";
import { _xtermManager } from "./devPanel/spawnXterm.js";
import { runInstall } from "./process.js";
import { addInformation, removeInformation } from "./titlebar.js";

export async function install(project_details: IProjectDetails) {
  if (project_details?.venv?.python) {
    const result = await window.ipc.invoke(
      "workbench.workspace.python.project.check.package",
      project_details,
      "notebook"
    );

    if (!result) {
      const informationEl = addInformation("Installing notebook");
      const logContainer = informationEl.querySelector(
        ".log-container"
      ) as HTMLDivElement;

      runInstall(
        project_details.venv.python,
        ["-m", "pip", "install", "notebook"],
        async () => {
          removeInformation(informationEl);
        },
        (log: string) => {
          const logEl = document.createElement("span");
          logEl.textContent = log;
          console.log(log);
          logContainer.appendChild(logEl);
        }
      );
    }
  } else {
    const result = await window.ipc.invoke(
      "workbench.workspace.python.check.package",
      "notebook"
    );

    const arg =
      window.node.platform === "linux" ? "--break-system-packages" : "-v";

    if (!result) {
      const informationEl = addInformation("Installing notebook");
      const logContainer = informationEl.querySelector(
        ".log-container"
      ) as HTMLDivElement;

      runInstall(
        "python",
        ["-m", "pip", "install", "notebook", arg],
        async () => {
          removeInformation(informationEl);
        },
        (log: string) => {
          const logEl = document.createElement("span");
          logEl.textContent = log;
          logContainer.appendChild(logEl);
        }
      );
    }
  }
}

document.addEventListener(
  "workbench.workspace.virtual.env.complete",
  async (_event) => {
    const _customEvent = _event as CustomEvent;
    const _action = _customEvent.detail.action;

    const project_details = await window.ipc.invoke(
      "workbench.workspace.details"
    );

    await install(project_details);

    _xtermManager._update();

    await window.jupyter.startKernel();
  }
);
