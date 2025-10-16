import { context } from "../../../src/code/platform/extension/common/extension.context.js";

export function activate(context: context) {
  try {
    const _port = 3216;

    const _serverCli = context.workbench.workspace.utils.path.join(
      context.workbench.workspace.utils.path.__dirname,
      "language",
      "typescript",
      "lib",
      "cli.mjs"
    );

    const _tsServerPath = context.workbench.workspace.utils.path.join(
      context.workbench.workspace.utils.path.__dirname,
      "..",
      "node_modules",
      "typescript",
      "lib"
    );

    const _server = context.workbench.workspace.language.createLanguageServer(
      "javascript",
      "js",
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
