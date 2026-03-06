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
  DocumentFormattingRequest,
} from "vscode-languageserver-protocol";
import { LSP_BRIDGE_PORT } from "../../../shared/lsp/lsp.constants";
import {
  path_to_uri,
  uri_to_path,
  normalize_uri,
  model_uri,
  to_lsp_position,
  to_monaco_range,
  lsp_severity_to_monaco,
  lsp_completion_to_monaco,
  to_lsp_completion_context,
  get_name_position,
  apply_lsp_edits,
} from "./editor.monaco.lsp.helpers";

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

class client {
  private definitions: LspClientDefinition[] = [];
  private connections = new Map<string, LspConnection>();
  private sockets = new Map<string, WebSocket>();
  private disposables = new Map<string, monaco.IDisposable[]>();
  private workspaceUri = "file:///workspace";
  private started = false;

  private lensEmitters = new Map<
    string,
    monaco.Emitter<monaco.languages.CodeLensProvider>
  >();

  private fire_lens_emitter(languageId: string) {
    this.lensEmitters.get(languageId)?.fire(undefined as any);
  }

  register(def: LspClientDefinition) {
    this.definitions.push(def);
  }

  async start() {
    if (this.started) await this.dispose();
    this.started = true;
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
    this.started = false;
    for (const disps of this.disposables.values())
      disps.forEach((d) => d.dispose());
    this.disposables.clear();
    this.connections.clear();
    for (const ws of this.sockets.values()) {
      if (ws.readyState === WebSocket.OPEN) ws.close();
    }
    this.sockets.clear();
    for (const emitter of this.lensEmitters.values()) emitter.dispose();
    this.lensEmitters.clear();
  }

  async format_model(model: monaco.editor.ITextModel): Promise<boolean> {
    const languageId = model.getLanguageId();
    const conn = this.connections.get(languageId);
    if (!conn?.initialized) return false;

    try {
      await conn.ready;
      const edits = await send_request(
        conn,
        DocumentFormattingRequest.type.method,
        {
          textDocument: { uri: normalize_uri(model_uri(model)) },
          options: {
            tabSize: model.getOptions().tabSize,
            insertSpaces: model.getOptions().insertSpaces ?? true,
          },
        },
      );
      if (!edits?.length) return false;
      apply_lsp_edits(model, edits);
      return true;
    } catch (e) {
      console.error("[LSP] format_model error", e);
      return false;
    }
  }

  private connect(def: LspClientDefinition) {
    const existing = this.sockets.get(def.languageId);
    if (existing) {
      existing.close();
      this.sockets.delete(def.languageId);
      this.connections.delete(def.languageId);
    }

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
          const id = typeof msg.id === "string" ? parseInt(msg.id, 10) : msg.id;
          const p = conn.pending.get(id);
          if (p) {
            conn.pending.delete(id);
            if (msg.error) p.reject(msg.error);
            else p.resolve(msg.result);
          } else {
            console.warn(
              `[LSP] No pending handler for id=${msg.id} (normalized=${id}), pending keys:`,
              [...conn.pending.keys()],
            );
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
            formatting: {
              dynamicRegistration: false,
            },
            definition: { dynamicRegistration: false },
            references: { dynamicRegistration: false },
            publishDiagnostics: { relatedInformation: true },
          },
          workspace: {
            workspaceFolders: true,
            workDoneProgress: true,
            configuration: true,
          },
          window: { workDoneProgress: true },
        },
      } as InitializeParams);

      send_notification(conn, InitializedNotification.type.method, {});
      send_notification(conn, "workspace/didChangeConfiguration", {
        settings: {
          pylsp: {
            plugins: {
              pycodestyle: { enabled: false },
              mccabe: { enabled: false },
              pyflakes: { enabled: false },
              pylint: { enabled: false },
              flake8: { enabled: false },
              autopep8: { enabled: false },
              yapf: { enabled: false },
              black: { enabled: true },
              ruff: { enabled: true },
            },
          },
        },
      });
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
        const mUri = normalize_uri(model_uri(m));
        return mUri === normalize_uri(uri);
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

      this.fire_lens_emitter(def.languageId);
    }
  }

  private did_open(conn: LspConnection, model: monaco.editor.ITextModel) {
    const uri = normalize_uri(model_uri(model));
    send_notification(conn, DidOpenTextDocumentNotification.type.method, {
      textDocument: {
        uri,
        languageId: model.getLanguageId(),
        version: model.getVersionId(),
        text: model.getValue(),
      },
    });
  }

  private did_close(conn: LspConnection, model: monaco.editor.ITextModel) {
    send_notification(conn, DidCloseTextDocumentNotification.type.method, {
      textDocument: { uri: normalize_uri(model_uri(model)) },
    });
  }

  private register_providers(
    def: LspClientDefinition,
    _: LspConnection,
  ): monaco.IDisposable[] {
    const selector = def.languageId;
    const disps: monaco.IDisposable[] = [];

    const getConn = (): LspConnection | null =>
      this.connections.get(def.languageId) ?? null;

    const emitter = new monaco.Emitter<monaco.languages.CodeLensProvider>();
    this.lensEmitters.set(def.languageId, emitter);
    disps.push(emitter);

    const lensDataMap = new Map<
      string,
      Map<
        string,
        {
          model: monaco.editor.ITextModel;
          pos: { line: number; character: number };
        }
      >
    >();

    disps.push(
      monaco.languages.registerCodeLensProvider(selector, {
        onDidChange: emitter.event,

        async provideCodeLenses(model) {
          const conn = getConn();
          if (!conn?.initialized) return { lenses: [], dispose: () => {} };
          await conn.ready;

          const uri = normalize_uri(model_uri(model));

          try {
            const symbols = await send_request(
              conn,
              "textDocument/documentSymbol",
              { textDocument: { uri } },
            );

            if (!symbols) return { lenses: [], dispose: () => {} };

            const fileMap = new Map<
              string,
              {
                model: monaco.editor.ITextModel;
                pos: { line: number; character: number };
              }
            >();
            lensDataMap.set(uri, fileMap);

            const lenses: monaco.languages.CodeLens[] = [];
            const SYMBOL_KINDS_WITH_REFS = new Set([5, 6, 9, 12]);

            function collect(syms: any[]) {
              for (const sym of syms) {
                if (SYMBOL_KINDS_WITH_REFS.has(sym.kind)) {
                  const range = sym.range ?? sym.location?.range;
                  if (!range) continue;

                  const pos = get_name_position(model, sym);
                  const id = `${sym.name}:${pos.line}:${pos.character}`;
                  fileMap.set(id, { model, pos });

                  const lens = {
                    range: to_monaco_range(range),
                  } as monaco.languages.CodeLens;
                  (lens as any)._id = id;
                  lenses.push(lens);
                }
                if (sym.children?.length) collect(sym.children);
              }
            }

            collect(Array.isArray(symbols) ? symbols : [symbols]);

            return { lenses, dispose: () => {} };
          } catch (err) {
            console.error("[CodeLens] provideCodeLenses error", err);
            return { lenses: [], dispose: () => {} };
          }
        },

        async resolveCodeLens(model, lens) {
          const conn = getConn();
          const noop: monaco.languages.Command = { id: "", title: "0 usages" };

          if (!conn) {
            lens.command = noop;
            return lens;
          }

          const uri = normalize_uri(model_uri(model));
          const id = (lens as any)._id as string | undefined;
          const data = id ? lensDataMap.get(uri)?.get(id) : undefined;

          if (!data) {
            lens.command = noop;
            return lens;
          }

          try {
            const refs = await send_request(
              conn,
              ReferencesRequest.type.method,
              {
                textDocument: { uri },
                position: data.pos,
                context: { includeDeclaration: false },
              },
            );
            const count = refs?.length ?? 0;
            lens.command = {
              id: "editor.action.referenceSearch.trigger",
              title: `${count} usage${count === 1 ? "" : "s"}`,
              arguments: [
                data.model.uri,
                {
                  lineNumber: data.pos.line + 1,
                  column: data.pos.character + 1,
                },
              ],
            };
            return lens;
          } catch (err) {
            console.error("[CodeLens] resolveCodeLens error", err);
            lens.command = noop;
            return lens;
          }
        },
      }),
    );

    disps.push(
      monaco.editor.onDidCreateModel((model) => {
        if (!this.model_matches(model, def)) return;
        const liveConn = getConn();
        if (liveConn) this.did_open(liveConn, model);

        let changeTimer: ReturnType<typeof setTimeout> | null = null;

        const d1 = model.onDidChangeContent(() => {
          const c = getConn();
          if (!c?.initialized) return;
          const uri = normalize_uri(model_uri(model));

          if (changeTimer) clearTimeout(changeTimer);
          changeTimer = setTimeout(() => {
            changeTimer = null;
            send_notification(
              c,
              DidChangeTextDocumentNotification.type.method,
              {
                textDocument: { uri, version: model.getVersionId() },
                contentChanges: [{ text: model.getValue() }],
              },
            );
          }, 300);
        });

        const d2 = model.onWillDispose(() => {
          const c = getConn();
          if (c) this.did_close(c, model);
          if (changeTimer) clearTimeout(changeTimer);
          const uri = normalize_uri(model_uri(model));
          lensDataMap.delete(uri);
          d1.dispose();
          d2.dispose();
        });

        disps.push(d1, d2);
      }),
    );

    disps.push(
      monaco.languages.registerCompletionItemProvider(selector, {
        triggerCharacters: [".", '"', "'", "`", "/", "@", "<", "#"],
        async provideCompletionItems(model, position, context) {
          const conn = getConn();
          if (!conn?.initialized) return null;
          if (model.getValue().trim().length === 0) return null;
          await conn.ready;
          try {
            const result = await send_request(
              conn,
              CompletionRequest.type.method,
              {
                textDocument: { uri: normalize_uri(model_uri(model)) },
                position: to_lsp_position(position, model),
                context: to_lsp_completion_context(context),
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
          } catch {
            return null;
          }
        },
      }),
    );

    disps.push(
      monaco.languages.registerHoverProvider(selector, {
        async provideHover(model, position) {
          const conn = getConn();
          if (!conn?.initialized) return null;
          await conn.ready;
          try {
            const result = await send_request(conn, HoverRequest.type.method, {
              textDocument: { uri: normalize_uri(model_uri(model)) },
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
          const conn = getConn();
          if (!conn?.initialized) return null;
          await conn.ready;
          try {
            const result = await send_request(
              conn,
              SignatureHelpRequest.type.method,
              {
                textDocument: { uri: normalize_uri(model_uri(model)) },
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
          const conn = getConn();
          if (!conn?.initialized) return null;
          await conn.ready;
          try {
            const result = await send_request(
              conn,
              DefinitionRequest.type.method,
              {
                textDocument: { uri: normalize_uri(model_uri(model)) },
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
          const conn = getConn();
          if (!conn?.initialized) return null;
          await conn.ready;
          try {
            const result = await send_request(
              conn,
              ReferencesRequest.type.method,
              {
                textDocument: { uri: normalize_uri(model_uri(model)) },
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

    disps.push(
      monaco.languages.registerDocumentFormattingEditProvider(selector, {
        async provideDocumentFormattingEdits(model) {
          const conn = getConn();
          if (!conn?.initialized) return [];
          await conn.ready;
          try {
            const edits = await send_request(
              conn,
              DocumentFormattingRequest.type.method,
              {
                textDocument: { uri: normalize_uri(model_uri(model)) },
                options: {
                  tabSize: model.getOptions().tabSize,
                  insertSpaces: model.getOptions().insertSpaces ?? true,
                },
              },
            );
            if (!edits?.length) return [];
            return edits.map((e: any) => ({
              range: to_monaco_range(e.range),
              text: e.newText,
            }));
          } catch (err) {
            console.error("[LSP] provideDocumentFormattingEdits error", err);
            return [];
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

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    lsp_client.dispose();
  });
}
