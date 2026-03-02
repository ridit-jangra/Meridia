import * as monaco from "monaco-editor";
import {
  toSocket,
  WebSocketMessageReader,
  WebSocketMessageWriter,
} from "vscode-ws-jsonrpc";
import {
  InitializeParams,
  InitializeRequest,
  InitializedNotification,
  DidOpenTextDocumentNotification,
  DidChangeTextDocumentNotification,
  DidCloseTextDocumentNotification,
  CompletionRequest,
  HoverRequest,
  PublishDiagnosticsNotification,
  DefinitionRequest,
  ReferencesRequest,
  SignatureHelpRequest,
  DiagnosticSeverity,
} from "vscode-languageserver-protocol";
import { LSP_BRIDGE_PORT } from "../../../shared/lsp/lsp.constants";

export interface LspClientDefinition {
  languageId: string;
  extensions?: string[];
}

interface PendingRequest {
  resolve: (v: any) => void;
  reject: (e: any) => void;
}

interface LspConnection {
  reader: WebSocketMessageReader;
  writer: WebSocketMessageWriter;
  nextId: number;
  pending: Map<number, PendingRequest>;
  initialized: boolean;
  languageId: string;
  ready: Promise<void>;
  markReady: () => void;
}

function make_ready_promise(
  _: string,
  timeoutMs = 8000,
): { ready: Promise<void>; markReady: () => void } {
  let resolved = false;
  let markReady!: () => void;
  const ready = new Promise<void>((resolve) => {
    markReady = () => {
      if (resolved) return;
      resolved = true;
      resolve();
    };
  });
  setTimeout(() => {
    if (!resolved) markReady();
  }, timeoutMs);
  return { ready, markReady };
}

function send_request(
  conn: LspConnection,
  method: string,
  params: any,
): Promise<any> {
  const id = conn.nextId++;
  return new Promise((resolve, reject) => {
    conn.pending.set(id, { resolve, reject });
    conn.writer.write({ jsonrpc: "2.0", id, method, params } as any);
  });
}

function send_notification(
  conn: LspConnection,
  method: string,
  params: any,
): void {
  conn.writer.write({ jsonrpc: "2.0", method, params } as any);
}

function model_uri(model: monaco.editor.ITextModel): string {
  return path_to_uri(model.uri.fsPath || model.uri.path);
}

function path_to_uri(fsPath: string): string {
  const normalized = fsPath.replace(/\\/g, "/");
  return normalized.startsWith("/")
    ? `file://${normalized}`
    : `file:///${normalized}`;
}

function uri_to_path(uri: string): string {
  return uri
    .replace(/^file:\/\/\/([a-zA-Z]:)/, "$1")
    .replace(/^file:\/\//, "")
    .replace(/\//g, path.sep);
}

const path = { sep: navigator.userAgent.includes("Windows") ? "\\" : "/" };

function to_lsp_position(
  pos: monaco.Position,
  model: monaco.editor.ITextModel,
): { line: number; character: number } {
  const lineCount = model.getLineCount();
  const line = Math.max(0, Math.min(pos.lineNumber - 1, lineCount - 1));
  const maxColumn = model.getLineMaxColumn(line + 1);
  const character = Math.max(0, Math.min(pos.column - 1, maxColumn - 1));
  return { line, character };
}

function to_monaco_range(range: any): monaco.IRange {
  return {
    startLineNumber: range.start.line + 1,
    startColumn: range.start.character + 1,
    endLineNumber: range.end.line + 1,
    endColumn: range.end.character + 1,
  };
}

function lsp_severity_to_monaco(severity: DiagnosticSeverity | undefined) {
  switch (severity) {
    case DiagnosticSeverity.Error:
      return monaco.MarkerSeverity.Error;
    case DiagnosticSeverity.Warning:
      return monaco.MarkerSeverity.Warning;
    case DiagnosticSeverity.Information:
      return monaco.MarkerSeverity.Info;
    case DiagnosticSeverity.Hint:
      return monaco.MarkerSeverity.Hint;
    default:
      return monaco.MarkerSeverity.Error;
  }
}

function lsp_completion_to_monaco(
  item: any,
  model: monaco.editor.ITextModel,
  position: monaco.Position,
): monaco.languages.CompletionItem {
  const word = model.getWordUntilPosition(position);
  const defaultRange = {
    startLineNumber: position.lineNumber,
    startColumn: word.startColumn,
    endLineNumber: position.lineNumber,
    endColumn: position.column,
  };
  return {
    label: item.label,
    kind: ((item.kind ?? 1) - 1) as monaco.languages.CompletionItemKind,
    detail: item.detail,
    documentation: item.documentation
      ? {
          value:
            typeof item.documentation === "string"
              ? item.documentation
              : (item.documentation.value ?? ""),
        }
      : undefined,
    insertText:
      item.insertText ??
      (typeof item.label === "string" ? item.label : item.label.label),
    insertTextRules:
      item.insertTextFormat === 2
        ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
        : undefined,
    range: item.textEdit?.range
      ? to_monaco_range(item.textEdit.range)
      : defaultRange,
    sortText: item.sortText,
    filterText: item.filterText,
    preselect: item.preselect,
    tags: item.deprecated ? [1] : undefined,
  };
}

class client {
  private definitions: LspClientDefinition[] = [];
  private connections = new Map<string, LspConnection>();
  private sockets = new Map<string, WebSocket>();
  private disposables = new Map<string, monaco.IDisposable[]>();
  private workspaceUri = "file:///workspace";

  register(def: LspClientDefinition) {
    this.definitions.push(def);
  }

  async start() {
    try {
      const p = await window.workspace.get_current_workspace_path();
      if (p) this.workspaceUri = path_to_uri(p);
    } catch {}
    for (const def of this.definitions) this.connect(def);
  }

  async updateWorkspaceRoot(folderPath: string) {
    this.workspaceUri = path_to_uri(folderPath);
    await this.dispose();
    await this.start();
  }

  async dispose() {
    for (const disps of this.disposables.values())
      disps.forEach((d) => d.dispose());
    this.disposables.clear();
    this.connections.clear();
    for (const ws of this.sockets.values()) {
      if (ws.readyState === WebSocket.OPEN) ws.close();
    }
    this.sockets.clear();
  }

  private connect(def: LspClientDefinition) {
    const workspacePath = uri_to_path(this.workspaceUri);
    const url = `ws://127.0.0.1:${LSP_BRIDGE_PORT}/${def.languageId}?workspace=${encodeURIComponent(workspacePath)}`;
    const ws = new WebSocket(url);
    this.sockets.set(def.languageId, ws);

    ws.onopen = async () => {
      const socket = toSocket(ws);
      const reader = new WebSocketMessageReader(socket);
      const writer = new WebSocketMessageWriter(socket);
      const { ready, markReady } = make_ready_promise(def.languageId);

      const conn: LspConnection = {
        reader,
        writer,
        nextId: 1,
        pending: new Map(),
        initialized: false,
        languageId: def.languageId,
        ready,
        markReady,
      };
      this.connections.set(def.languageId, conn);

      reader.listen((msg: any) => {
        if (msg.id != null && "method" in msg) {
          this.handle_server_request(def, conn, msg);
          return;
        }
        if (msg.id != null && !("method" in msg)) {
          const p = conn.pending.get(msg.id);
          if (p) {
            conn.pending.delete(msg.id);
            if (msg.error) p.reject(msg.error);
            else p.resolve(msg.result);
          }
          return;
        }
        if ("method" in msg) this.handle_notification(def, conn, msg);
      });

      await send_request(conn, InitializeRequest.type.method, {
        processId: null,
        clientInfo: { name: "Meridia" },
        rootUri: this.workspaceUri,
        workspaceFolders: [{ uri: this.workspaceUri, name: "workspace" }],
        capabilities: {
          textDocument: {
            synchronization: {
              dynamicRegistration: false,
              willSave: false,
              willSaveWaitUntil: false,
              didSave: false,
              change: 1,
            },
            completion: {
              completionItem: {
                snippetSupport: true,
                documentationFormat: ["plaintext", "markdown"],
              },
              contextSupport: true,
            },
            hover: { contentFormat: ["plaintext", "markdown"] },
            signatureHelp: {
              signatureInformation: {
                documentationFormat: ["plaintext", "markdown"],
              },
            },
            definition: { dynamicRegistration: false },
            references: { dynamicRegistration: false },
            publishDiagnostics: { relatedInformation: true },
          },
          workspace: { workspaceFolders: true, workDoneProgress: true },
          window: { workDoneProgress: true },
        },
      } as InitializeParams);

      send_notification(conn, InitializedNotification.type.method, {});
      conn.initialized = true;

      this.disposables.set(def.languageId, this.register_providers(def, conn));

      for (const model of monaco.editor.getModels()) {
        if (this.model_matches(model, def)) this.did_open(conn, model);
      }
    };

    ws.onerror = (e) =>
      console.error(`[LSP:${def.languageId}] WebSocket error`, e);
    ws.onclose = () => {
      this.sockets.delete(def.languageId);
      this.connections.delete(def.languageId);
    };
  }

  private handle_server_request(
    _: LspClientDefinition,
    conn: LspConnection,
    msg: any,
  ) {
    conn.writer.write({ jsonrpc: "2.0", id: msg.id, result: null } as any);
  }

  private handle_notification(
    def: LspClientDefinition,
    conn: LspConnection,
    msg: any,
  ) {
    if (msg.method === "$/progress") {
      if (msg.params?.value?.kind === "end") conn.markReady();
      return;
    }

    if (msg.method === PublishDiagnosticsNotification.type.method) {
      const { uri, diagnostics } = msg.params;
      conn.markReady();
      const model = monaco.editor.getModels().find((m) => {
        const mUri = model_uri(m);
        return mUri === uri || mUri.toLowerCase() === uri.toLowerCase();
      });
      if (!model) return;
      monaco.editor.setModelMarkers(
        model,
        def.languageId,
        diagnostics.map((d: any) => ({
          startLineNumber: d.range.start.line + 1,
          startColumn: d.range.start.character + 1,
          endLineNumber: d.range.end.line + 1,
          endColumn: d.range.end.character + 1,
          message: d.message,
          severity: lsp_severity_to_monaco(d.severity),
          source: d.source,
        })),
      );
    }
  }

  private did_open(conn: LspConnection, model: monaco.editor.ITextModel) {
    send_notification(conn, DidOpenTextDocumentNotification.type.method, {
      textDocument: {
        uri: model_uri(model),
        languageId: model.getLanguageId(),
        version: model.getVersionId(),
        text: model.getValue(),
      },
    });
  }

  private did_close(conn: LspConnection, model: monaco.editor.ITextModel) {
    send_notification(conn, DidCloseTextDocumentNotification.type.method, {
      textDocument: { uri: model_uri(model) },
    });
  }

  private register_providers(
    def: LspClientDefinition,
    conn: LspConnection,
  ): monaco.IDisposable[] {
    const selector = def.languageId;
    const disps: monaco.IDisposable[] = [];

    disps.push(
      monaco.editor.onDidCreateModel((model) => {
        if (!this.model_matches(model, def)) return;
        this.did_open(conn, model);

        const d1 = model.onDidChangeContent(() => {
          if (!conn.initialized) return;
          send_notification(
            conn,
            DidChangeTextDocumentNotification.type.method,
            {
              textDocument: {
                uri: model_uri(model),
                version: model.getVersionId(),
              },
              contentChanges: [{ text: model.getValue() }],
            },
          );
        });

        const d2 = model.onWillDispose(() => {
          this.did_close(conn, model);
          d1.dispose();
          d2.dispose();
        });

        disps.push(d1, d2);
      }),
    );

    function toLspCompletionContext(
      context?: monaco.languages.CompletionContext,
    ) {
      return context?.triggerCharacter
        ? { triggerKind: 2, triggerCharacter: context.triggerCharacter }
        : { triggerKind: 1 };
    }

    disps.push(
      monaco.languages.registerCompletionItemProvider(selector, {
        triggerCharacters: [".", '"', "'", "`", "/", "@", "<", "#"],
        async provideCompletionItems(model, position, context) {
          if (!conn.initialized) return null;
          await conn.ready;
          const result = await send_request(
            conn,
            CompletionRequest.type.method,
            {
              textDocument: { uri: model_uri(model) },
              position: to_lsp_position(position, model),
              context: toLspCompletionContext(context),
            },
          );
          if (!result) return null;
          const items = Array.isArray(result) ? result : (result.items ?? []);
          return {
            suggestions: items.map((item: any) =>
              lsp_completion_to_monaco(item, model, position),
            ),
            incomplete: result.isIncomplete ?? false,
          };
        },
      }),
    );

    disps.push(
      monaco.languages.registerHoverProvider(selector, {
        async provideHover(model, position) {
          if (!conn.initialized) return null;
          await conn.ready;
          try {
            const result = await send_request(conn, HoverRequest.type.method, {
              textDocument: { uri: model_uri(model) },
              position: to_lsp_position(position, model),
            });
            if (!result?.contents) return null;
            const contents = Array.isArray(result.contents)
              ? result.contents
              : [result.contents];
            return {
              contents: contents.map((c: any) => ({
                value: typeof c === "string" ? c : (c.value ?? ""),
              })),
              range: result.range ? to_monaco_range(result.range) : undefined,
            };
          } catch {
            return null;
          }
        },
      }),
    );

    disps.push(
      monaco.languages.registerSignatureHelpProvider(selector, {
        signatureHelpTriggerCharacters: ["(", ","],
        async provideSignatureHelp(model, position) {
          if (!conn.initialized) return null;
          await conn.ready;
          try {
            const result = await send_request(
              conn,
              SignatureHelpRequest.type.method,
              {
                textDocument: { uri: model_uri(model) },
                position: to_lsp_position(position, model),
              },
            );
            if (!result?.signatures?.length) return null;
            return {
              value: {
                signatures: result.signatures.map((s: any) => ({
                  label: s.label,
                  documentation: s.documentation
                    ? {
                        value:
                          typeof s.documentation === "string"
                            ? s.documentation
                            : s.documentation.value,
                      }
                    : undefined,
                  parameters: (s.parameters ?? []).map((p: any) => ({
                    label: p.label,
                    documentation: p.documentation
                      ? {
                          value:
                            typeof p.documentation === "string"
                              ? p.documentation
                              : p.documentation.value,
                        }
                      : undefined,
                  })),
                })),
                activeSignature: result.activeSignature ?? 0,
                activeParameter: result.activeParameter ?? 0,
              },
              dispose: () => {},
            };
          } catch {
            return null;
          }
        },
      }),
    );

    disps.push(
      monaco.languages.registerDefinitionProvider(selector, {
        async provideDefinition(model, position) {
          if (!conn.initialized) return null;
          await conn.ready;
          try {
            const result = await send_request(
              conn,
              DefinitionRequest.type.method,
              {
                textDocument: { uri: model_uri(model) },
                position: to_lsp_position(position, model),
              },
            );
            if (!result) return null;
            const locs = Array.isArray(result) ? result : [result];
            return locs.map((loc: any) => ({
              uri: monaco.Uri.parse(loc.uri),
              range: to_monaco_range(loc.range),
            }));
          } catch {
            return null;
          }
        },
      }),
    );

    disps.push(
      monaco.languages.registerReferenceProvider(selector, {
        async provideReferences(model, position) {
          if (!conn.initialized) return null;
          await conn.ready;
          try {
            const result = await send_request(
              conn,
              ReferencesRequest.type.method,
              {
                textDocument: { uri: model_uri(model) },
                position: to_lsp_position(position, model),
                context: { includeDeclaration: true },
              },
            );
            if (!result) return null;
            return result.map((loc: any) => ({
              uri: monaco.Uri.parse(loc.uri),
              range: to_monaco_range(loc.range),
            }));
          } catch {
            return null;
          }
        },
      }),
    );

    return disps;
  }

  private model_matches(
    model: monaco.editor.ITextModel,
    def: LspClientDefinition,
  ): boolean {
    const lang = model.getLanguageId();
    if (lang === def.languageId) return true;
    const exts = def.extensions ?? [def.languageId];
    return exts.some((ext) => model.uri.path.endsWith(`.${ext}`));
  }
}

export const lsp_client = new client();
