import { context } from "../../../src/code/platform/extension/common/context.js";

export function activate(context: context) {
  try {
    const _port = 9712;

    const _serverCli = "pylsp";

    let pythonPath;

    const projectDetails = context.workbench.workspace.workspaceDetails();

    if (projectDetails && projectDetails.venv.python) {
      pythonPath = projectDetails.venv.python;
    } else {
      pythonPath = "python";
    }

    const pylspPath = context.workbench.workspace.utils.path.join(
      context.workbench.workspace.utils.path.__dirname,
      "extensions",
      "languages",
      "python",
      "server",
      "pylsp.pyz"
    );

    const command = `${pythonPath} ${pylspPath}`;

    const _server = context.workbench.workspace.language.createLanguageServer(
      command,
      "py",
      _port,
      "-v",
      "cli",
      {
        port: _port,
      },
      [],
      _serverCli
    );

    context.workbench.workspace.language.registerLanguageServer(_server);
  } catch (err) {}
}
