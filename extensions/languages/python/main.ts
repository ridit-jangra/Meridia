import { context } from "../../../src/code/platform/extension/common/context.js";

export function activate(context: context) {
  try {
    const _port = 9712;

    const _win = context.workbench.workspace.utils.platform === "win32";

    const _winPath = context.workbench.workspace.utils.path.join(
      "win32",
      "pylsp.exe"
    );
    const _otherPath = context.workbench.workspace.utils.path.join(
      "linux",
      "pylsp"
    );

    const _serverCli = context.workbench.workspace.utils.path.join(
      context.workbench.workspace.utils.path.__dirname,
      "extensions",
      "languages",
      "python",
      "server",
      _win ? _winPath : _otherPath
    );

    const _server = context.workbench.workspace.language.createLanguageServer(
      "pylsp",
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
