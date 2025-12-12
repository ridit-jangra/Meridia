import { context } from "../../../src/code/platform/extension/common/context.js";

export function activate(context: context) {
  try {
    const _port = 8161;

    const node = context.workbench.workspace.utils.nodePath;

    const _serverCli = context.workbench.workspace.utils.path.join(
      context.workbench.workspace.utils.path.__dirname,
      "extensions",
      "languages",
      "javascript",
      "server",
      "cli.mjs"
    );

    const _server = context.workbench.workspace.language.createLanguageServer(
      "javascript",
      "js",
      _port,
      node,
      { port: _port },
      [_serverCli]
    );

    context.workbench.workspace.language.registerLanguageServer(_server);
  } catch (err) {}
}
