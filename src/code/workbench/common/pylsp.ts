import { _editor } from "../../editor/editors/editor.js";
import { _extensions } from "../../platform/extension/common/extension.js";
import { IProjectDetails } from "../workbench.types.js";
import { runInstall } from "./process.js";
import { addInformation, removeInformation } from "./titlebar.js";

export async function install(project_details: IProjectDetails) {
  if (project_details?.venv?.python) {
    const result = await window.ipc.invoke(
      "workbench.workspace.python.project.check.package",
      project_details,
      "python-lsp-server"
    );

    if (!result) {
      const informationEl = addInformation("Installing pylsp");

      runInstall(
        project_details.venv.python,
        ["-m", "pip", "install", "python-lsp-server[all]"],
        async () => {
          await _extensions.restart();
          await _editor.restart();
          removeInformation(informationEl);
        },
        () => {}
      );
    }
  } else {
    const result = await window.ipc.invoke(
      "workbench.workspace.python.check.package",
      "python-lsp-server"
    );

    const arg =
      window.node.platform === "linux" ? "--break-system-packages" : "-v";

    if (!result) {
      const informationEl = addInformation("Installing pylsp");

      runInstall(
        "python",
        ["-m", "pip", "install", "python-lsp-server[all]", arg],
        async () => {
          await _extensions.restart();
          await _editor.restart();
          removeInformation(informationEl);
        },
        () => {}
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
  }
);
