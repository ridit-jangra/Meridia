import { IConnection } from "vscode-ws-jsonrpc/server";
import { ServerOptions } from "ws";
import { ILanguageServerConfig } from "../extensions.type";
import { registerLanguageServer } from "../../editor/editor.languages";

export const api = {
  workbench: {
    workspace: {
      node: {
        createWebSocketServer: (options?: ServerOptions) => {
          return window.node.createWebSocketServer(options);
        },
      },
      language: {
        createLanguageServer: (
          name: string,
          language: string,
          _port: number,
          _serverCli: string,
          _type: "node" | "cli",
          _websocketOptions?: ServerOptions,
          _arg?: string,
          _cliPath?: string
        ) => {
          const _process = window.node.createLanguageServer(
            _port,
            _serverCli,
            _websocketOptions!,
            _arg!,
            _type,
            _cliPath
          );

          return {
            name: name,
            language: language,
            connection: _process,
            port: _port,
          } as ILanguageServerConfig;
        },
        registerLanguageServer: (_config: ILanguageServerConfig) => {
          registerLanguageServer(_config.language, _config.port);
        },
        stopLanguageServer: (_connection: IConnection | undefined) => {
          if (_connection) _connection.dispose();
        },
      },
      utils: {
        platform: window.node.platform,
      },
    },
  },
};
