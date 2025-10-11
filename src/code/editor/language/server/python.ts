import { WebSocketServer } from "ws";
import { Storage } from "../../../base/services/storage.service.js";
import path from "path";
import { Language } from "../editor.language.js";
import { _context } from "../../../platform/extension/common/extension.context.js";

export class Python extends Language {
  constructor() {
    super();

    this._port = Storage.get("language-port");
    this._websocket = new WebSocketServer({ port: this._port });
    this._serverCli = path.join(__dirname, "pyright", "langserver.index.js");

    this._start();
  }
}

const _python = new Python();
