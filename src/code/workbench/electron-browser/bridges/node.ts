import os from "os";
import { SpawnOptions } from "child_process";
import {
  createServerProcess,
  forward,
  IConnection,
} from "vscode-ws-jsonrpc/server";
import { createWebSocketConnection } from "vscode-ws-jsonrpc/server";
import { WebSocketServer, ServerOptions } from "ws";
import { IWebSocket } from "@codingame/monaco-jsonrpc";
import { IFolderStructure } from "../../workbench.types.js";
import { Storage } from "../../node/storage.js";

export const nodeBridge = {
  createWebSocketConnection: (_socket: IWebSocket) => {
    return createWebSocketConnection(_socket);
  },
  createWebSocketServer: (options?: ServerOptions) => {
    return new WebSocketServer(options);
  },
  createServerProcess: (
    _name: string,
    _command: string,
    _args: string[],
    _options: SpawnOptions,
  ) => {
    return createServerProcess(_name, _command, _args, _options);
  },
  forward: (_client: IConnection, _server: IConnection) => {
    return forward(_client, _server);
  },
  createLanguageServer: (
    _port: number,
    _server: string,
    _websocketOptions: ServerOptions,
    _args: string[],
  ) => {
    let _process: IConnection | undefined;
    const _websocket = new WebSocketServer(_websocketOptions);
    _websocket.on("connection", (webSocket) => {
      const socket = {
        send: (content: any) => webSocket.send(content),
        onMessage: (cb: any) => webSocket.on("message", cb),
        onError: (cb: any) => webSocket.on("error", cb),
        onClose: (cb: any) => webSocket.on("close", cb),
        dispose: () => webSocket.close(),
      };

      const connection = createWebSocketConnection(socket);

      _process = createServerProcess("Language Server", _server, _args, {
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          ...process.env,
          ELECTRON_RUN_AS_NODE: "1",
        },
      });

      forward(connection, _process!);

      webSocket.on("close", () => {});
    });

    return _process;
  },
  _processExecPath: process.execPath,
  platform: os.platform(),
  workspaceFolder: () => {
    let cwd;

    const folder_structure = Storage.get(
      "workbench.workspace.folder.structure",
    ) as IFolderStructure;

    if (folder_structure) {
      cwd = folder_structure.uri;
    } else {
      cwd = "/";
    }
    return cwd;
  },
};
