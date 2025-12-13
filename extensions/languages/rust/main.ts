import { context } from "../../../src/code/platform/extension/common/context.js";
import { ILanguageServerConfig } from "../../../src/code/platform/extension/types.js";

let _server: ILanguageServerConfig;

export function activate(context: context) {
  try {
    const _port = 1238;

    const _win = context.workbench.workspace.utils.platform === "win32";

    const _winPath = context.workbench.workspace.utils.path.join(
      "win32",
      "rust-analyzer.exe"
    );
    const _otherPath = context.workbench.workspace.utils.path.join(
      "linux",
      "rust-analyzer"
    );

    const _serverCli = context.workbench.workspace.utils.path.join(
      context.workbench.workspace.utils.path.__dirname,
      "extensions",
      "languages",
      "rust",
      "rust-analyzer",
      _win ? _winPath : _otherPath
    );

    _server = context.workbench.workspace.language.createLanguageServer(
      "rust-analyzer",
      "rs",
      _port,
      _serverCli,
      { port: _port },
      []
    );

    context.workbench.workspace.language.registerLanguageServer(_server);
  } catch (err) {}
}

export function deactivate(context: context) {
  context.workbench.workspace.language.stopLanguageServer(_server.connection);
}
