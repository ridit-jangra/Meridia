/**
 * LSP WebSocket Bridge — runs in the Electron main process.
 *
 * For each language, you define an LspServerDefinition that describes
 * how to launch the LSP binary. This server bridges WebSocket connections
 * from the renderer to stdio LSP processes.
 *
 * Usage in main.ts:
 *   import { LspBridge } from "./lsp.server";
 *   const bridge = new LspBridge();
 *   bridge.register(typescriptLsp);
 *   bridge.register(pythonLsp);
 *   bridge.start();
 *   // on app quit:
 *   bridge.stop();
 */

import * as http from "node:http";
import * as cp from "node:child_process";
import { WebSocketServer, WebSocket } from "ws";
import {
  createMessageConnection,
  StreamMessageReader,
  StreamMessageWriter,
} from "vscode-jsonrpc/node";
import {
  IWebSocket,
  WebSocketMessageReader,
  WebSocketMessageWriter,
} from "vscode-ws-jsonrpc";
import { LSP_BRIDGE_PORT } from "../../shared/lsp/lsp.constants";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LspServerDefinition {
  /** Unique language id matching Monaco's language id, e.g. "typescript" */
  languageId: string;
  /** The executable to spawn, e.g. "typescript-language-server" */
  command: string;
  /** Arguments passed to the executable, e.g. ["--stdio"] */
  args?: string[];
  /** Extra env vars merged with process.env */
  env?: Record<string, string>;
}

// ─── Bridge ──────────────────────────────────────────────────────────────────

export class LspBridge {
  private definitions = new Map<string, LspServerDefinition>();
  private server: http.Server | null = null;
  private wss: WebSocketServer | null = null;
  private workspacePath: string | null = null;

  /** Register a language server definition. Call before start(). */
  register(def: LspServerDefinition) {
    this.definitions.set(def.languageId, def);
  }

  /** Provide the current workspace root (call whenever the workspace changes). */
  setWorkspacePath(p: string) {
    this.workspacePath = p;
  }

  start() {
    this.server = http.createServer((_req, res) => {
      res.writeHead(200);
      res.end("LSP Bridge");
    });

    this.wss = new WebSocketServer({ server: this.server });

    this.wss.on("connection", (ws: WebSocket, req: http.IncomingMessage) => {
      // The renderer connects to ws://localhost:7998/<languageId>
      const languageId = (req.url ?? "/").slice(1); // strip leading "/"
      const def = this.definitions.get(languageId);

      if (!def) {
        console.warn(
          `[LSP Bridge] No definition for language: "${languageId}"`,
        );
        ws.close(1003, `No LSP registered for "${languageId}"`);
        return;
      }

      this.spawnAndBridge(def, ws);
    });

    this.server.listen(LSP_BRIDGE_PORT, "127.0.0.1", () => {
      console.log(
        `[LSP Bridge] Listening on ws://127.0.0.1:${LSP_BRIDGE_PORT}`,
      );
    });
  }

  stop() {
    this.wss?.close();
    this.server?.close();
  }

  // ── Internals ───────────────────────────────────────────────────────────────

  private spawnAndBridge(def: LspServerDefinition, ws: WebSocket) {
    const cwd = this.workspacePath ?? process.cwd();

    const lspProcess = cp.spawn(def.command, def.args ?? [], {
      cwd,
      env: { ...process.env, ...def.env },
      stdio: ["pipe", "pipe", "pipe"],
      shell: false,
    });

    lspProcess.on("error", (err) => {
      console.error(`[LSP Bridge:${def.languageId}] Spawn error:`, err.message);
      ws.close(1011, err.message);
    });

    lspProcess.on("exit", (code) => {
      console.log(`[LSP Bridge:${def.languageId}] Process exited (${code})`);
      if (ws.readyState === WebSocket.OPEN) ws.close();
    });

    lspProcess.stderr?.on("data", (chunk: Buffer) => {
      // LSP servers often log diagnostics to stderr — useful for debugging
      console.debug(`[LSP:${def.languageId}] ${chunk.toString().trim()}`);
    });

    // Wrap the raw WebSocket into the IWebSocket interface vscode-ws-jsonrpc expects
    const iws: IWebSocket = {
      send: (content) => ws.send(content),
      onMessage: (cb) => ws.on("message", (data) => cb(data.toString())),
      onClose: (cb) =>
        ws.on("close", (code, reason) => cb(code, reason.toString())),
      onError: (cb) => ws.on("error", cb),
      dispose: () => ws.close(),
    };

    // Readers / writers for both sides
    const socketReader = new WebSocketMessageReader(iws);
    const socketWriter = new WebSocketMessageWriter(iws);

    const processReader = new StreamMessageReader(lspProcess.stdout!);
    const processWriter = new StreamMessageWriter(lspProcess.stdin!);

    // Connect socket → process
    const socketConn = createMessageConnection(socketReader, socketWriter);
    const processConn = createMessageConnection(processReader, processWriter);

    // Pipe WebSocket messages → LSP process stdin
    ws.on("message", (data: Buffer | string) => {
      if (lspProcess.stdin?.writable) {
        lspProcess.stdin.write(typeof data === "string" ? data : data);
      }
    });

    // Pipe LSP process stdout → WebSocket
    lspProcess.stdout?.on("data", (chunk: Buffer) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(chunk);
      }
    });

    ws.on("close", () => {
      if (!lspProcess.killed) lspProcess.kill();
    });

    socketConn.onClose(() => {
      processConn.dispose();
      if (!lspProcess.killed) lspProcess.kill();
    });

    processConn.onClose(() => {
      socketConn.dispose();
    });

    socketConn.listen();
    processConn.listen();

    console.log(
      `[LSP Bridge:${def.languageId}] Bridged pid=${lspProcess.pid} ↔ WebSocket`,
    );
  }
}
