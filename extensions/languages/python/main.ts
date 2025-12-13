import { context } from "../../../src/code/platform/extension/common/context.js";
import { ILanguageServerConfig } from "../../../src/code/platform/extension/types.js";

let _server: ILanguageServerConfig;

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

    _server = context.workbench.workspace.language.createLanguageServer(
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

export function deactivate(context: context) {
  context.workbench.workspace.language.stopLanguageServer(_server.connection);
}
