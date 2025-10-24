import { context } from "../../../src/code/platform/extension/common/context.js";

export function activate(context: context) {
  try {
    const _port = 9712;

    const _serverCli = context.workbench.workspace.utils.path.join(
      context.workbench.workspace.utils.path.__dirname,
      "language",
      "python",
      "langserver.index.js"
    );

    const _server = context.workbench.workspace.language.createLanguageServer(
      "pyright",
      "py",
      _port,
      _serverCli,
      "node",
      {
        port: _port,
      },
      ["--stdio"]
    );

    context.workbench.workspace.language.registerLanguageServer(_server);
  } catch (err) {
    console.error(err);
  }
}
