import * as http from "node:http";
import * as cp from "node:child_process";
import { existsSync } from "node:fs";
import * as path from "node:path";
import { WebSocketServer, WebSocket } from "ws";
import { LSP_BRIDGE_PORT } from "../../shared/lsp/lsp.constants";

export interface LspServerDefinition {
  languageId: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export class server {
  private definitions = new Map<string, LspServerDefinition>();
  private httpServer: http.Server | null = null;
  private wss: WebSocketServer | null = null;
  private workspacePath: string | null = null;

  register(def: LspServerDefinition) {
    this.definitions.set(def.languageId, def);
  }

  setWorkspacePath(p: string) {
    this.workspacePath = p;
  }

  start() {
    this.httpServer = http.createServer((_req, res) => {
      res.writeHead(200);
      res.end("LSP Bridge");
    });

    this.wss = new WebSocketServer({ server: this.httpServer });

    this.wss.on("connection", (ws: WebSocket, req: http.IncomingMessage) => {
      const languageId = (req.url ?? "/").slice(1);
      const def = this.definitions.get(languageId);

      if (!def) {
        ws.close(1003, `No LSP registered for "${languageId}"`);
        return;
      }

      this.spawnAndBridge(def, ws);
    });

    this.httpServer.listen(LSP_BRIDGE_PORT, "127.0.0.1", () => {});
  }

  stop() {
    this.wss?.close();
    this.httpServer?.close();
  }

  private spawnAndBridge(def: LspServerDefinition, ws: WebSocket) {
    const cwd = this.workspacePath ?? process.cwd();

    const lspProcess = cp.spawn(def.command, def.args ?? [], {
      cwd,
      env: { ...process.env, ...def.env },
      stdio: ["pipe", "pipe", "pipe"],
      shell: false,
    });

    lspProcess.on("error", (err) => {
      ws.close(1011, err.message);
    });

    lspProcess.on("exit", () => {
      if (ws.readyState === WebSocket.OPEN) ws.close();
    });

    ws.on("message", (data: Buffer | string) => {
      if (!lspProcess.stdin?.writable) return;
      const json = typeof data === "string" ? data : data.toString("utf8");

      const body = Buffer.from(json, "utf8");
      const header = `Content-Length: ${body.length}\r\n\r\n`;
      lspProcess.stdin.write(header);
      lspProcess.stdin.write(body);
    });

    let buf = Buffer.alloc(0);

    lspProcess.stdout?.on("data", (chunk: Buffer) => {
      buf = Buffer.concat([buf, chunk]);

      while (true) {
        const sep = buf.indexOf("\r\n\r\n");
        if (sep === -1) break;

        const header = buf.slice(0, sep).toString("utf8");
        const match = header.match(/Content-Length:\s*(\d+)/i);
        if (!match) {
          buf = buf.slice(sep + 4);
          break;
        }

        const contentLength = parseInt(match[1], 10);
        const bodyStart = sep + 4;
        if (buf.length < bodyStart + contentLength) break;

        const body = buf
          .slice(bodyStart, bodyStart + contentLength)
          .toString("utf8");
        buf = buf.slice(bodyStart + contentLength);

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(body);
        }
      }
    });

    ws.on("close", () => {
      if (!lspProcess.killed) lspProcess.kill();
    });
  }
}

export function resolve_node_bin(appRoot: string): string {
  const candidates = [
    path.join(
      path.dirname(process.execPath),
      process.platform === "win32" ? "node.exe" : "node",
    ),
    path.join(
      appRoot,
      "node_modules",
      ".bin",
      process.platform === "win32" ? "node.exe" : "node",
    ),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return process.platform === "win32" ? "node.exe" : "node";
}
