import { _extensions } from "../../platform/extension/common/extension";
import { showDownloadBox } from "../../platform/messagebox/common/messagebox";

async function check() {
  const result = await window.ipc.invoke(
    "workbench.workspace.python.check.package",
    "python-lsp-server"
  );

  const arg =
    window.node.platform === "linux" ? "--break-system-packages" : "-v";

  if (!result) {
    await showDownloadBox(
      "Install Python Language Server",
      "python-lsp-server is required for Python IntelliSense, linting, and formatting features. Install it now to enable full Python support?",
      "python",
      ["-m", "pip", "install", "python-lsp-server", arg],
      () => {
        window.workbench.reload();
      }
    );
  }
}

check();
