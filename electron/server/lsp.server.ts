import * as http from "node:http";
import * as cp from "node:child_process";
import { existsSync } from "node:fs";
import * as path from "node:path";
import { URL } from "node:url";
import { WebSocketServer, WebSocket } from "ws";
import {
  IWebSocket,
  WebSocketMessageReader,
  WebSocketMessageWriter,
} from "vscode-ws-jsonrpc";
import {
  createConnection,
  createServerProcess,
  forward,
} from "vscode-ws-jsonrpc/server";
import { Message } from "vscode-languageserver-protocol";
import { LSP_BRIDGE_PORT } from "../../shared/lsp/lsp.constants";

export interface LspServerDefinition {
  languageId: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

function is_windows_store_stub(p: string): boolean {
  return p.toLowerCase().includes("windowsapps");
}

export function resolve_python(): string | null {
  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA ?? "";
    const candidates: string[] = [];
    for (const v of ["314", "313", "312", "311", "310", "39", "38"]) {
      candidates.push(`C:\\Python${v}\\python.exe`);
      candidates.push(
        `${localAppData}\\Programs\\Python\\Python${v}\\python.exe`,
      );
    }
    for (const p of candidates) {
      if (!p || !existsSync(p) || is_windows_store_stub(p)) continue;
      const ok = cp.spawnSync(p, ["--version"], {
        encoding: "utf8",
        timeout: 3000,
      });
      if (ok.status === 0) {
        console.log(
          `[LSP-BRIDGE] Found Python at "${p}": ${(ok.stdout || ok.stderr).trim()}`,
        );
        return p;
      }
    }
  }

  const bins =
    process.platform === "win32"
      ? ["python.exe", "python3.exe"]
      : ["python3", "python"];
  for (const bin of bins) {
    try {
      const which = cp.spawnSync(
        process.platform === "win32" ? "where" : "which",
        [bin],
        { encoding: "utf8", timeout: 3000 },
      );
      if (which.status !== 0) continue;
      for (const line of which.stdout
        .trim()
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)) {
        if (is_windows_store_stub(line)) continue;
        const ver = cp.spawnSync(line, ["--version"], {
          encoding: "utf8",
          timeout: 3000,
        });
        if (ver.status === 0) {
          console.log(
            `[LSP-BRIDGE] Found Python "${line}": ${(ver.stdout || ver.stderr).trim()}`,
          );
          return line;
        }
      }
    } catch {
      /* try next */
    }
  }

  console.warn("[LSP-BRIDGE] No Python found");
  return null;
}

function resolve_pylsp(
  pythonPath: string,
): { command: string; args: string[] } | null {
  const dir = path.dirname(pythonPath);
  const exe_candidates =
    process.platform === "win32"
      ? [
          path.join(dir, "Scripts", "pylsp.exe"),
          path.join(dir, "Scripts", "pylsp"),
        ]
      : [path.join(dir, "pylsp"), path.join(path.dirname(dir), "bin", "pylsp")];

  for (const p of exe_candidates) {
    if (existsSync(p)) {
      console.log(`[LSP-BRIDGE] Found pylsp at "${p}"`);
      return { command: p, args: [] };
    }
  }

  const mod = cp.spawnSync(pythonPath, ["-m", "pylsp", "--version"], {
    encoding: "utf8",
    timeout: 5000,
  });
  if (mod.status === 0) return { command: pythonPath, args: ["-m", "pylsp"] };

  console.error(
    `[LSP-BRIDGE] pylsp not found — run: "${pythonPath}" -m pip install python-lsp-server`,
  );
  return null;
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
      const url = new URL(`http://localhost${req.url ?? "/"}`);
      const languageId = url.pathname.slice(1);
      const wsParam = url.searchParams.get("workspace");
      const workspacePath = wsParam
        ? decodeURIComponent(wsParam)
        : (this.workspacePath ?? process.cwd());

      console.log(
        `[LSP-BRIDGE] Incoming WS: languageId="${languageId}" workspace="${workspacePath}"`,
      );

      const def = this.definitions.get(languageId);
      if (!def) {
        console.error(`[LSP-BRIDGE] No LSP registered for "${languageId}"`);
        ws.close(1003, `No LSP registered for "${languageId}"`);
        return;
      }

      this.spawnAndBridge(def, workspacePath, ws);
    });

    this.httpServer.listen(LSP_BRIDGE_PORT, "127.0.0.1", () => {
      console.log(
        `[LSP-BRIDGE] Listening on ws://127.0.0.1:${LSP_BRIDGE_PORT}`,
      );
    });
  }

  stop() {
    this.wss?.close();
    this.httpServer?.close();
  }

  private spawnAndBridge(
    def: LspServerDefinition,
    workspacePath: string,
    ws: WebSocket,
  ) {
    const tag = `:${def.languageId}`;
    const env = { ...process.env, ...def.env };

    let command: string;
    let args: string[];

    if (def.languageId === "python") {
      const pythonPath = resolve_python();
      if (!pythonPath) {
        ws.close(1011, "No Python interpreter found");
        return;
      }
      const pylsp = resolve_pylsp(pythonPath);
      if (!pylsp) {
        ws.close(
          1011,
          "pylsp not installed — run: pip install python-lsp-server",
        );
        return;
      }
      command = pylsp.command;
      args = pylsp.args;
    } else {
      command = def.command;
      args = [...(def.args ?? [])];
    }

    console.log(
      `[LSP-BRIDGE${tag}] Spawning: "${command}" cwd="${workspacePath}"`,
    );

    const iws: IWebSocket = {
      send: (content) => ws.send(content),
      onMessage: (cb) => ws.on("message", cb),
      onError: (cb) => ws.on("error", cb),
      onClose: (cb) => ws.on("close", cb),
      dispose: () => ws.close(),
    };

    const socketConnection = createConnection(
      new WebSocketMessageReader(iws),
      new WebSocketMessageWriter(iws),
      () => iws.dispose(),
    );

    const serverConnection = createServerProcess(
      def.languageId,
      command,
      args,
      {
        cwd: workspacePath,
        env,
        shell: false,
      },
    )!;

    forward(socketConnection, serverConnection, (message: Message) => {
      const m = message as any;
      console.log(
        `[LSP-BRIDGE${tag}:client->lsp] ${m.method ?? "(response)"}${m.id != null ? ` id=${m.id}` : ""}`,
      );
      return message;
    });

    forward(serverConnection, socketConnection, (message: Message) => {
      const m = message as any;
      console.log(
        `[LSP-BRIDGE${tag}:lsp->client] ${m.method ?? "(response)"}${m.id != null ? ` id=${m.id}` : ""}`,
      );
      return message;
    });

    ws.on("close", () => serverConnection.dispose());
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
    if (existsSync(candidate)) return candidate;
  }
  return process.platform === "win32" ? "node.exe" : "node";
}
