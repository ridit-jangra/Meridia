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

// ── Python interpreter resolution ─────────────────────────────────────────────

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
        if (is_windows_store_stub(line)) {
          console.warn(`[LSP-BRIDGE] Skipping Windows Store stub: "${line}"`);
          continue;
        }
        const ver = cp.spawnSync(line, ["--version"], {
          encoding: "utf8",
          timeout: 3000,
        });
        if (ver.status === 0) {
          console.log(
            `[LSP-BRIDGE] Found Python in PATH "${line}": ${(ver.stdout || ver.stderr).trim()}`,
          );
          return line;
        }
      }
    } catch {
      /* try next */
    }
  }

  console.warn("[LSP-BRIDGE] No real Python found");
  return null;
}

/**
 * Find pylsp next to the given python binary.
 * Falls back to `python -m pylsp` if the script isn't on disk.
 */
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
      console.log(`[LSP-BRIDGE] Found pylsp executable at "${p}"`);
      return { command: p, args: [] };
    }
  }

  const mod = cp.spawnSync(pythonPath, ["-m", "pylsp", "--version"], {
    encoding: "utf8",
    timeout: 5000,
  });
  if (mod.status === 0) {
    console.log(
      `[LSP-BRIDGE] pylsp available as module: ${(mod.stdout || mod.stderr).trim()}`,
    );
    return { command: pythonPath, args: ["-m", "pylsp"] };
  }

  console.error(
    `[LSP-BRIDGE] pylsp not found.\n` +
      `[LSP-BRIDGE] Install with: "${pythonPath}" -m pip install python-lsp-server`,
  );
  return null;
}

// ── Server ────────────────────────────────────────────────────────────────────

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
    console.log(`[LSP-BRIDGE] workspacePath updated: ${p}`);
  }

  start() {
    this.httpServer = http.createServer((_req, res) => {
      res.writeHead(200);
      res.end("LSP Bridge");
    });

    this.wss = new WebSocketServer({ server: this.httpServer });

    this.wss.on("connection", (ws: WebSocket, req: http.IncomingMessage) => {
      const base = `http://localhost${req.url ?? "/"}`;
      const url = new URL(base);
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
        console.error(
          `[LSP-BRIDGE] No LSP registered for "${languageId}" — closing`,
        );
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
        console.error(`[LSP-BRIDGE${tag}] No Python found — cannot start LSP`);
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
      `[LSP-BRIDGE${tag}] Spawning: "${command}" ${args.map((a) => `"${a}"`).join(" ")}`,
    );
    console.log(`[LSP-BRIDGE${tag}] cwd="${workspacePath}"`);

    // Wrap the raw ws.WebSocket in IWebSocket for vscode-ws-jsonrpc
    const iws: IWebSocket = {
      send: (content) => ws.send(content),
      onMessage: (cb) => ws.on("message", cb),
      onError: (cb) => ws.on("error", cb),
      onClose: (cb) => ws.on("close", cb),
      dispose: () => ws.close(),
    };

    // WebSocket → JSON-RPC connection (towards the Monaco editor client)
    const reader = new WebSocketMessageReader(iws);
    const writer = new WebSocketMessageWriter(iws);
    const socketConnection = createConnection(reader, writer, () =>
      iws.dispose(),
    );

    // Spawn the LSP process and wrap its stdio in a JSON-RPC connection.
    // createServerProcess handles Content-Length framing and stderr piping.
    // IConnection starts listening automatically — no .listen() call needed.
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

    // Bidirectional forward with logging
    forward(socketConnection, serverConnection, (message: Message) => {
      const m = message as any;
      const method = m.method ?? "(response)";
      const id = m.id != null ? ` id=${m.id}` : "";
      console.log(
        `[LSP-BRIDGE${tag}:client->lsp] ${method}${id}`,
        JSON.stringify(m.params ?? m.result ?? {}).slice(0, 160),
      );
      return message;
    });

    forward(serverConnection, socketConnection, (message: Message) => {
      const m = message as any;
      const method = m.method ?? "(response)";
      const id = m.id != null ? ` id=${m.id}` : "";
      console.log(
        `[LSP-BRIDGE${tag}:lsp->client] ${method}${id}`,
        JSON.stringify(m.params ?? m.result ?? {}).slice(0, 160),
      );
      return message;
    });

    ws.on("close", (code, reason) => {
      console.log(`[LSP-BRIDGE${tag}] WS closed code=${code} reason=${reason}`);
      serverConnection.dispose();
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
      console.log(`[LSP-BRIDGE] Resolved node bin: ${candidate}`);
      return candidate;
    }
  }
  console.warn(
    `[LSP-BRIDGE] Could not resolve node bin, falling back to system node`,
  );
  return process.platform === "win32" ? "node.exe" : "node";
}
