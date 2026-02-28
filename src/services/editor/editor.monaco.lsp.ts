/**
 * LSP Client Manager
 *
 * Implements the Language Server Protocol client using only:
 *   - vscode-ws-jsonrpc  (WebSocket transport)
 *   - vscode-jsonrpc     (JSON-RPC message connection)
 *
 * No dependency on `vscode`, `vscode-languageclient`, or
 * `monaco-languageclient` — those all require the VS Code extension host
 * which cannot run in an Electron renderer.
 *
 * This manually sends LSP lifecycle messages (initialize / initialized /
 * textDocument/didOpen etc.) and wires Monaco's model events to the server.
 */

import {
  createMessageConnection,
  MessageConnection,
  NotificationType,
  RequestType,
} from "vscode-jsonrpc";
import {
  toSocket,
  WebSocketMessageReader,
  WebSocketMessageWriter,
} from "vscode-ws-jsonrpc";
import { editor as monacoEditor, Uri } from "monaco-editor";
import { LSP_BRIDGE_PORT } from "../../../shared/lsp/lsp.constants";

// ─── LSP protocol types (minimal) ────────────────────────────────────────────

interface Position {
  line: number;
  character: number;
}

interface TextDocumentIdentifier {
  uri: string;
}

interface VersionedTextDocumentIdentifier extends TextDocumentIdentifier {
  version: number;
}

interface TextDocumentItem {
  uri: string;
  languageId: string;
  version: number;
  text: string;
}

interface InitializeParams {
  processId: number | null;
  rootUri: string | null;
  capabilities: Record<string, unknown>;
  workspaceFolders: Array<{ uri: string; name: string }> | null;
}

// LSP method names
const M = {
  Initialize: "initialize" as const,
  Initialized: "initialized" as const,
  Shutdown: "shutdown" as const,
  Exit: "exit" as const,
  DidOpen: "textDocument/didOpen" as const,
  DidChange: "textDocument/didChange" as const,
  DidClose: "textDocument/didClose" as const,
  PublishDiagnostics: "textDocument/publishDiagnostics" as const,
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LspClientDefinition {
  languageId: string;
  extensions?: string[];
}

// ─── Manager ─────────────────────────────────────────────────────────────────

export class LspClientManager {
  private definitions: LspClientDefinition[] = [];
  private connections = new Map<string, MessageConnection>();
  private sockets = new Map<string, WebSocket>();
  private modelDisposers = new Map<string, Array<() => void>>();
  private workspaceUri = "file:///workspace";

  register(def: LspClientDefinition) {
    this.definitions.push(def);
  }

  async start() {
    try {
      const p = await window.workspace.get_current_workspace_path();
      if (p) this.workspaceUri = pathToUri(p);
    } catch {
      // not available in all contexts
    }

    for (const def of this.definitions) {
      this.connectLanguage(def);
    }
  }

  async updateWorkspaceRoot(folderPath: string) {
    this.workspaceUri = pathToUri(folderPath);
    await this.dispose();
    await this.start();
  }

  async dispose() {
    // Detach all Monaco model listeners
    for (const disposers of this.modelDisposers.values()) {
      for (const d of disposers) d();
    }
    this.modelDisposers.clear();

    // Gracefully shut down each connection
    for (const [lang, conn] of this.connections) {
      try {
        await conn.sendRequest(new RequestType(M.Shutdown), undefined);
        conn.sendNotification(new NotificationType(M.Exit));
      } catch {
        // ignore — server may already be gone
      }
      conn.dispose();
      console.log(`[LSP:${lang}] Shut down`);
    }
    this.connections.clear();

    for (const ws of this.sockets.values()) {
      if (ws.readyState === WebSocket.OPEN) ws.close();
    }
    this.sockets.clear();
  }

  // ── Internals ───────────────────────────────────────────────────────────────

  private connectLanguage(def: LspClientDefinition) {
    const url = `ws://127.0.0.1:${LSP_BRIDGE_PORT}/${def.languageId}`;
    const ws = new WebSocket(url);
    this.sockets.set(def.languageId, ws);

    ws.onopen = async () => {
      const iws = toSocket(ws);
      const reader = new WebSocketMessageReader(iws);
      const writer = new WebSocketMessageWriter(iws);
      const conn = createMessageConnection(reader, writer);

      conn.listen();
      this.connections.set(def.languageId, conn);

      // ── Initialize handshake ──────────────────────────────────────────────
      const initParams: InitializeParams = {
        processId: null,
        rootUri: this.workspaceUri,
        workspaceFolders: [{ uri: this.workspaceUri, name: "workspace" }],
        capabilities: {
          textDocument: {
            synchronization: {
              dynamicRegistration: true,
              willSave: false,
              didSave: false,
              willSaveWaitUntil: false,
            },
            completion: {
              dynamicRegistration: true,
              completionItem: {
                snippetSupport: true,
                commitCharactersSupport: true,
                documentationFormat: ["markdown", "plaintext"],
                deprecatedSupport: true,
                preselectSupport: true,
              },
              contextSupport: true,
            },
            hover: {
              dynamicRegistration: true,
              contentFormat: ["markdown", "plaintext"],
            },
            signatureHelp: {
              dynamicRegistration: true,
              signatureInformation: {
                documentationFormat: ["markdown", "plaintext"],
              },
            },
            definition: { dynamicRegistration: true },
            references: { dynamicRegistration: true },
            documentHighlight: { dynamicRegistration: true },
            documentSymbol: { dynamicRegistration: true },
            codeAction: { dynamicRegistration: true },
            codeLens: { dynamicRegistration: true },
            rename: { dynamicRegistration: true },
            publishDiagnostics: { relatedInformation: true },
          },
          workspace: {
            applyEdit: true,
            workspaceEdit: { documentChanges: true },
            didChangeConfiguration: { dynamicRegistration: true },
            workspaceFolders: true,
          },
        },
      };

      try {
        await conn.sendRequest(
          new RequestType<InitializeParams, unknown, unknown>(M.Initialize),
          initParams,
        );
        conn.sendNotification(new NotificationType(M.Initialized), {});
        console.log(`[LSP:${def.languageId}] Initialized`);

        // Sync all already-open models for this language
        this.syncExistingModels(def, conn);

        // Watch future model changes
        this.watchModels(def, conn);
      } catch (err) {
        console.error(`[LSP:${def.languageId}] Initialize failed`, err);
      }

      conn.onClose(() => {
        console.log(`[LSP:${def.languageId}] Connection closed`);
        this.connections.delete(def.languageId);
      });
    };

    ws.onerror = (e) => {
      console.warn(
        `[LSP:${def.languageId}] WebSocket error — is the bridge running?`,
        e,
      );
    };

    ws.onclose = () => {
      this.sockets.delete(def.languageId);
    };
  }

  /** Send didOpen for every Monaco model that matches this language. */
  private syncExistingModels(
    def: LspClientDefinition,
    conn: MessageConnection,
  ) {
    const exts = def.extensions ?? [def.languageId];
    for (const model of monacoEditor.getModels()) {
      if (this.modelMatchesDef(model, def.languageId, exts)) {
        conn.sendNotification(
          new NotificationType<{ textDocument: TextDocumentItem }>(M.DidOpen),
          {
            textDocument: {
              uri: model.uri.toString(),
              languageId: def.languageId,
              version: model.getVersionId(),
              text: model.getValue(),
            },
          },
        );
      }
    }
  }

  /** Watch Monaco model create/change/dispose events and forward to LSP. */
  private watchModels(def: LspClientDefinition, conn: MessageConnection) {
    const exts = def.extensions ?? [def.languageId];
    const key = def.languageId;
    const disposers: Array<() => void> = [];

    // New model opened
    const d1 = monacoEditor.onDidCreateModel((model) => {
      if (!this.modelMatchesDef(model, def.languageId, exts)) return;
      conn.sendNotification(
        new NotificationType<{ textDocument: TextDocumentItem }>(M.DidOpen),
        {
          textDocument: {
            uri: model.uri.toString(),
            languageId: def.languageId,
            version: model.getVersionId(),
            text: model.getValue(),
          },
        },
      );

      // Content changes
      const d = model.onDidChangeContent((e) => {
        conn.sendNotification(
          new NotificationType<{
            textDocument: VersionedTextDocumentIdentifier;
            contentChanges: Array<{ text: string }>;
          }>(M.DidChange),
          {
            textDocument: {
              uri: model.uri.toString(),
              version: model.getVersionId(),
            },
            // Full sync — simplest and most compatible
            contentChanges: [{ text: model.getValue() }],
          },
        );
      });
      disposers.push(() => d.dispose());
    });

    // Model disposed
    const d2 = monacoEditor.onWillDisposeModel((model) => {
      if (!this.modelMatchesDef(model, def.languageId, exts)) return;
      conn.sendNotification(
        new NotificationType<{ textDocument: TextDocumentIdentifier }>(
          M.DidClose,
        ),
        { textDocument: { uri: model.uri.toString() } },
      );
    });

    disposers.push(
      () => d1.dispose(),
      () => d2.dispose(),
    );
    this.modelDisposers.set(key, disposers);
  }

  private modelMatchesDef(
    model: monacoEditor.ITextModel,
    languageId: string,
    exts: string[],
  ): boolean {
    if (model.getLanguageId() === languageId) return true;
    const path = model.uri.path;
    return exts.some((ext) => path.endsWith(`.${ext}`));
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pathToUri(fsPath: string): string {
  const normalized = fsPath.replace(/\\/g, "/");
  return normalized.startsWith("/")
    ? `file://${normalized}`
    : `file:///${normalized}`;
}

// ─── Singleton ───────────────────────────────────────────────────────────────

export const lspClientManager = new LspClientManager();
