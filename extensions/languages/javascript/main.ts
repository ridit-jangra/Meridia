import { context } from "../../../src/code/platform/extension/common/context.js";
import { ILanguageServerConfig } from "../../../src/code/platform/extension/types.js";

let _server: ILanguageServerConfig;

export function activate(context: context) {
  try {
    const _port = 8161;

    const node = context.workbench.workspace.utils.nodePath;

    const _serverCli = context.workbench.workspace.utils.path.join(
      context.workbench.workspace.utils.path.__dirname,
      "extensions",
      "languages",
      "typescript",
      "server",
      "cli.mjs",
    );

    _server = context.workbench.workspace.language.createLanguageServer(
      "javascript",
      "js",
      _port,
      node,
      { port: _port },
      [_serverCli],
    );

    context.workbench.workspace.language.registerLanguageServer(_server);
  } catch (err) {}
}

export function deactivate(context: context) {
  context.workbench.workspace.language.stopLanguageServer(_server.connection);
}
