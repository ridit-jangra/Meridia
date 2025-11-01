import http from "http";
import fs from "fs";
import path from "path";

export class HttpServer {
  public _port: number;
  public _dir: string;
  private _server: http.Server;

  constructor(port: number = 8080) {
    this._port = port;
    this._dir = path.join(__dirname, "..", "..", "..");

    this._server = http.createServer(this.requestHandler.bind(this));
  }

  private requestHandler(req: http.IncomingMessage, res: http.ServerResponse) {
    let reqUrl = req.url || "/";
    if (reqUrl === "/") {
      reqUrl = "/index.html";
    }

    const filePath = path.join(this._dir, decodeURI(reqUrl));
    const ext = path.extname(filePath).toLowerCase();

    const mimeTypes: { [key: string]: string } = {
      ".html": "text/html",
      ".js": "application/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".wasm": "application/wasm",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
    };

    const contentType = mimeTypes[ext] || "application/octet-stream";

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("404 Not Found");
        return;
      }

      res.writeHead(200, { "Content-Type": contentType });
      res.end(data);
    });
  }

  public _serve() {
    this._server.listen(this._port, () => {});
  }

  public _stop() {
    this._server.close(() => {});
  }
}
