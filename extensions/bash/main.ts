import { context } from "../../src/code/platform/extension/common/extension.context.js";

export function activate(context: context) {
  try {
    const _port = 5784;

    const _serverCli = context.workbench.workspace.utils.path.join(
      context.workbench.workspace.utils.path.__dirname,
      "language",
      "bash",
      "out",
      "cli.js"
    );

    const _server = context.workbench.workspace.language.createLanguageServer(
      "bash",
      "sh",
      _port,
      _serverCli,
      "node",
      {
        port: _port,
      },
      "start"
    );

    context.workbench.workspace.language.registerLanguageServer(_server);
  } catch (err) {
    console.error(err);
  }
}
