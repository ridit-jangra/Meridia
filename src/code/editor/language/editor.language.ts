import { IConnection } from "vscode-ws-jsonrpc/server";
import { createServerProcess, forward } from "vscode-ws-jsonrpc/server";
import { createWebSocketConnection } from "vscode-ws-jsonrpc/server";
import { WebSocketServer } from "ws";
import { Storage } from "../../base/services/storage.service.js";

export class Language {
  _port!: number;
  _websocket!: WebSocketServer;
  _serverCli!: string;
  _process!: IConnection | undefined;

  constructor() {
    Storage.store("language-server-port", 9273);
  }

  _start() {
    this._websocket.on("connection", (webSocket) => {
      const socket = {
        send: (content: any) => webSocket.send(content),
        onMessage: (cb: any) => webSocket.on("message", cb),
        onError: (cb: any) => webSocket.on("error", cb),
        onClose: (cb: any) => webSocket.on("close", cb),
        dispose: () => webSocket.close(),
      };

      const connection = createWebSocketConnection(socket);

      this._process = createServerProcess(
        "Language Server",
        process.execPath,
        [this._serverCli, "--stdio"],
        {
          stdio: ["pipe", "pipe", "pipe"],
          env: {
            ...process.env,
            ELECTRON_RUN_AS_NODE: "1",
          },
        }
      );

      forward(connection, this._process!);

      webSocket.on("close", () => {
        this._stop();
      });
    });
  }

  _stop() {
    if (this._process) this._process.dispose();
  }
}
