import { _extensions } from "../../platform/extension/common/extension.js";
import { showDownloadBox } from "../../platform/messagebox/common/messagebox.js";
import { IProjectDetails } from "../workbench.types.js";

async function check() {
  const project_details = (await window.ipc.invoke(
    "workbench.workspace.details"
  )) as IProjectDetails;
  if (project_details?.venv?.python) {
    const result = await window.ipc.invoke(
      "workbench.workspace.python.project.check.package",
      project_details,
      "python-lsp-server"
    );

    console.log(result, "venv");

    if (!result) {
      showDownloadBox(
        "Install Python Language Server",
        "python-lsp-server is required for Python IntelliSense, linting, and formatting features. Install it now to enable full Python support?",
        project_details.venv.python,
        ["-m", "pip", "install", "python-lsp-server[all]"],
        () => {
          window.workbench.reload();
        }
      );
    }
  } else {
    const result = await window.ipc.invoke(
      "workbench.workspace.python.check.package",
      "python-lsp-server"
    );
    console.log(result, "no venv");

    const arg =
      window.node.platform === "linux" ? "--break-system-packages" : "-v";

    if (!result) {
      showDownloadBox(
        "Install Python Language Server",
        "python-lsp-server is required for Python IntelliSense, linting, and formatting features. Install it now to enable full Python support?",
        "python",
        ["-m", "pip", "install", "python-lsp-server[all]", arg],
        () => {
          window.workbench.reload();
        }
      );
    }
  }
}

check();
