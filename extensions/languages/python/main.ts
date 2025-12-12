import { context } from "../../../src/code/platform/extension/common/context.js";

export function activate(context: context) {
  try {
    const _port = 9712;

    let python = "python";

    const project_details = context.workbench.workspace.workspaceDetails();

    if (project_details?.venv?.python) python = project_details.venv.python;

    const _serverCli = context.workbench.workspace.utils.path.join(
      context.workbench.workspace.utils.path.__dirname,
      "extensions",
      "languages",
      "python",
      "server",
      "server.py"
    );

    const _server = context.workbench.workspace.language.createLanguageServer(
      "pylsp",
      "py",
      _port,
      python,
      {
        port: _port,
      },
      [_serverCli]
    );

    context.workbench.workspace.language.registerLanguageServer(_server);
  } catch (err) {
    console.error("extension error", err);
  }
}
