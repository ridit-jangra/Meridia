import * as http from "node:http";
import * as cp from "node:child_process";
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
} from "vscode-ws-jsonrpc/server";
import { Message } from "vscode-languageserver-protocol";
import type { LspServerDefinition } from "./types";

export class Server {
  private definitions = new Map<string, LspServerDefinition>();
  private httpServer: http.Server | null = null;
  private wss: WebSocketServer | null = null;
  private workspacePath: string | null = null;
  private activeChildren = new Map<string, cp.ChildProcess>();

  register(def: LspServerDefinition): this {
    this.definitions.set(def.languageId, def);
    return this;
  }

  setWorkspacePath(p: string): this {
    this.workspacePath = p;
    return this;
  }

  start(port = 9721): Promise<void> {
    this.httpServer = http.createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "ok",
          languages: [...this.definitions.keys()],
        }),
      );
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
        `[relay] ws: languageId="${languageId}" workspace="${workspacePath}"`,
      );

      const def = this.definitions.get(languageId);
      if (!def) {
        console.error(`[relay] no LSP registered for "${languageId}"`);
        ws.close(1003, `No LSP registered for "${languageId}"`);
        return;
      }

      // Resolve command — static definition takes priority, then resolver
      let command: string;
      let args: string[];

      if (def.command) {
        command = def.command;
        args = [...(def.args ?? [])];
      } else if (def.resolve) {
        const resolved = def.resolve();
        if (!resolved) {
          const msg = `[relay] resolver returned null for "${languageId}" — language server not available`;
          console.error(msg);
          ws.close(1011, msg);
          return;
        }
        command = resolved.command;
        args = [...(resolved.args ?? [])];
      } else {
        const msg = `[relay] no command or resolver provided for "${languageId}"`;
        console.error(msg);
        ws.close(1011, msg);
        return;
      }

      const prevChild = this.activeChildren.get(languageId);
      if (prevChild && !prevChild.killed) {
        console.log(
          `[relay] killing previous ${languageId} child pid=${prevChild.pid}`,
        );
        prevChild.kill("SIGTERM");
        this.activeChildren.delete(languageId);
      }

      this.spawnAndBridge(def, command, args, workspacePath, ws);
    });

    return new Promise((resolve, reject) => {
      this.httpServer!.listen(port, "127.0.0.1", () => {
        console.log(`\n  ⚡ relay listening on ws://127.0.0.1:${port}`);
        for (const lang of this.definitions.keys()) {
          console.log(`     └─ ws://127.0.0.1:${port}/${lang}`);
        }
        console.log();
        resolve();
      });
      this.httpServer!.on("error", reject);
    });
  }

  stop(): Promise<void> {
    for (const child of this.activeChildren.values()) {
      if (!child.killed) child.kill("SIGTERM");
    }
    this.activeChildren.clear();
    this.wss?.close();
    return new Promise((resolve) => {
      if (this.httpServer) this.httpServer.close(() => resolve());
      else resolve();
    });
  }

  private spawnAndBridge(
    def: LspServerDefinition,
    command: string,
    args: string[],
    workspacePath: string,
    ws: WebSocket,
  ): void {
    const tag = `:${def.languageId}`;
    const env = { ...process.env, ...def.env };

    console.log(`[relay${tag}] spawning: "${command}" cwd="${workspacePath}"`);

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

    const child = (serverConnection as unknown as { process?: cp.ChildProcess })
      .process;
    if (child) {
      this.activeChildren.set(def.languageId, child);
      console.log(`[relay${tag}] tracking child pid=${child.pid}`);
    }

    const POSITION_METHODS = new Set([
      "textDocument/completion",
      "textDocument/hover",
      "textDocument/definition",
      "textDocument/references",
      "textDocument/signatureHelp",
      "textDocument/documentHighlight",
      "textDocument/rename",
      "textDocument/rangeFormatting",
      "textDocument/onTypeFormatting",
    ]);

    const openDocs = new Map<string, number>();

    socketConnection.reader.listen((message: Message) => {
      const m = message as Record<string, unknown> & {
        method?: string;
        id?: unknown;
        params?: Record<string, unknown>;
      };

      console.log(
        `[relay${tag}:c→lsp] ${m.method ?? "(response)"}${m.id != null ? ` id=${m.id}` : ""}`,
      );

      if (m.method === "textDocument/didOpen") {
        const td = m.params?.textDocument as
          | Record<string, unknown>
          | undefined;
        const text = (td?.text as string) ?? "";
        const uri = ((td?.uri as string) ?? "").toLowerCase();
        openDocs.set(uri, text.split("\n").length);
        console.log(
          `[relay${tag}] didOpen uri="${uri}" lines=${openDocs.get(uri)}`,
        );
      }
      if (m.method === "textDocument/didChange") {
        const td = m.params?.textDocument as
          | Record<string, unknown>
          | undefined;
        const uri = ((td?.uri as string) ?? "").toLowerCase();
        const changes = m.params?.contentChanges as
          | Array<Record<string, unknown>>
          | undefined;
        const text = (changes?.[0]?.text as string) ?? "";
        if (text) openDocs.set(uri, text.split("\n").length);
      }
      if (m.method === "textDocument/didClose") {
        const td = m.params?.textDocument as
          | Record<string, unknown>
          | undefined;
        const uri = ((td?.uri as string) ?? "").toLowerCase();
        openDocs.delete(uri);
      }

      if (m.method && POSITION_METHODS.has(m.method) && m.params?.position) {
        const td = m.params?.textDocument as
          | Record<string, unknown>
          | undefined;
        const uri = ((td?.uri as string) ?? "").toLowerCase();
        const lineCount = openDocs.get(uri) ?? 0;

        if (lineCount === 0) {
          console.warn(
            `[relay${tag}] blocking ${m.method} — doc not open: ${uri}`,
          );
          if (m.id != null) {
            socketConnection.writer.write({
              jsonrpc: "2.0",
              id: m.id,
              result: null,
            } as Message);
          }
          return;
        }

        const pos = m.params.position as { line: number; character: number };
        const clamped = Math.max(0, Math.min(pos.line, lineCount - 1));
        if (pos.line !== clamped) {
          console.warn(
            `[relay${tag}] clamping ${m.method} line ${pos.line} → ${clamped} (${lineCount} lines)`,
          );
          m.params.position = { ...pos, line: clamped };
        }
      }

      serverConnection.writer.write(message);
    });

    serverConnection.reader.listen((message: Message) => {
      const m = message as Record<string, unknown> & {
        method?: string;
        id?: unknown;
      };
      console.log(
        `[relay${tag}:lsp→c] ${m.method ?? "(response)"}${m.id != null ? ` id=${m.id}` : ""}`,
      );
      socketConnection.writer.write(message);
    });

    ws.on("close", () => {
      serverConnection.dispose();
      const tracked = this.activeChildren.get(def.languageId);
      if (tracked === child && child && !child.killed) {
        child.kill("SIGTERM");
        console.log(`[relay${tag}] killed child pid=${child.pid} on ws close`);
        this.activeChildren.delete(def.languageId);
      }
    });
  }
}
