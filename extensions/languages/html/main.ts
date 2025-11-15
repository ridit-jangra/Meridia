import { context } from "../../../src/code/platform/extension/common/context.js";

export function activate(context: context) {
  try {
    const _port = 2138;

    const _win = context.workbench.workspace.utils.platform === "win32";

    const _winPath = context.workbench.workspace.utils.path.join(
      "win32",
      "superhtml.exe"
    );
    const _otherPath = context.workbench.workspace.utils.path.join(
      "linux",
      "superhtml"
    );

    const _serverCli = context.workbench.workspace.utils.path.join(
      context.workbench.workspace.utils.path.__dirname,
      "extensions",
      "languages",
      "html",
      "superhtml",
      _win ? _winPath : _otherPath
    );

    const _server = context.workbench.workspace.language.createLanguageServer(
      "html",
      "html",
      _port,
      "lsp",
      "cli",
      { port: _port },
      ["lsp"],
      _serverCli
    );

    context.workbench.workspace.language.registerLanguageServer(_server);
  } catch (err) {}
}
