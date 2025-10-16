import { context } from "../../../src/code/platform/extension/common/extension.context.js";

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
      "rust",
      "rust-analyzer",
      _win ? _winPath : _otherPath
    );

    const _server = context.workbench.workspace.language.createLanguageServer(
      "rust",
      "rs",
      _port,
      "-v",
      "cli",
      {
        port: _port,
      },
      ["-v"],
      _serverCli
    );

    context.workbench.workspace.language.registerLanguageServer(_server);
  } catch (err) {
    console.error(err);
  }
}
