import { IConnection } from "vscode-ws-jsonrpc/server";
import { ServerOptions } from "ws";
import { ILanguageServerConfig } from "../types";
import {
  getLanguageServer,
  registerLanguageServer,
} from "../../editor/languages";
import { select } from "../../../workbench/common/store/selector";

export const api = {
  workbench: {
    workspace: {
      workspaceFolder: () => {
        return window.node.workspaceFolder();
      },
      workspaceDetails: () => {
        const details = select((s) => s.main.project_details);

        if (!details) return null;
        return details;
      },
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
          _server: string,
          _websocketOptions: ServerOptions,
          _args: string[]
        ) => {
          const _process = window.node.createLanguageServer(
            _port,
            _server,
            _websocketOptions,
            _args
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
        nodePath: window.node._processExecPath,
      },
    },
  },
};
