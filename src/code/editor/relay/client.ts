import type * as Monaco from "monaco-editor";
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
  CompletionResolveRequest,
  HoverRequest,
  PublishDiagnosticsNotification,
  DefinitionRequest,
  ReferencesRequest,
  SignatureHelpRequest,
  DocumentFormattingRequest,
} from "vscode-languageserver-protocol";
import {
  path_to_uri,
  uri_to_path,
  normalize_uri,
  canonical_uri,
  model_uri,
  to_lsp_position,
  to_monaco_range,
  lsp_severity_to_monaco,
  lsp_completion_to_monaco,
  to_lsp_completion_context,
  get_name_position,
  apply_lsp_edits,
} from "./utils";

export interface LspClientDefinition {
  languageId: string;
  extensions?: string[];
}

interface PendingRequest {
  resolve: (v: unknown) => void;
  reject: (e: unknown) => void;
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

function make_ready_promise(timeoutMs = 8000): {
  ready: Promise<void>;
  markReady: () => void;
} {
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
  params: unknown,
): Promise<unknown> {
  const id = conn.nextId++;
  return new Promise((resolve, reject) => {
    conn.pending.set(id, { resolve, reject });
    conn.writer.write({ jsonrpc: "2.0", id, method, params } as never);
  });
}

function send_notification(
  conn: LspConnection,
  method: string,
  params: unknown,
): void {
  conn.writer.write({ jsonrpc: "2.0", method, params } as never);
}




function lsp_language_id(model: Monaco.editor.ITextModel): string {
  const path = model.uri.path.toLowerCase();
  if (path.endsWith(".tsx")) return "typescriptreact";
  if (path.endsWith(".jsx")) return "javascriptreact";
  return model.getLanguageId();
}

export class Client {
  private monaco: typeof Monaco;
  private definitions: LspClientDefinition[] = [];
  private connections = new Map<string, LspConnection>();
  private sockets = new Map<string, WebSocket>();
  private disposables = new Map<string, Monaco.IDisposable[]>();
  private workspaceUri = "file:///workspace";
  private started = false;
  private model_listeners = new Map<string, Monaco.IDisposable[]>();
  private model_timers = new Map<string, ReturnType<typeof setTimeout>>();
  private lensEmitters = new Map<
    string,
    Monaco.Emitter<Monaco.languages.CodeLensProvider>
  >();

  /**
   * @param monaco Pass the monaco-editor module: `import * as monaco from "monaco-editor"`
   */
  constructor(monaco: typeof Monaco) {
    this.monaco = monaco;
  }

  private fire_lens_emitter(languageId: string) {
    this.lensEmitters.get(languageId)?.fire(undefined as never);
  }

  register(def: LspClientDefinition): this {
    this.definitions.push(def);
    return this;
  }

  async start(workspace_path = "workspace", port = 9721): Promise<void> {
    if (this.started) await this.dispose();
    this.started = true;
    if (workspace_path) this.workspaceUri = path_to_uri(workspace_path);
    for (const def of this.definitions) this.connect(def, port);
  }

  async updateWorkspaceRoot(folderPath: string): Promise<void> {
    this.workspaceUri = path_to_uri(folderPath);
    await this.dispose();
    await this.start();
  }

  async dispose(): Promise<void> {
    this.started = false;
    for (const disps of this.disposables.values())
      disps.forEach((d) => d.dispose());
    this.disposables.clear();
    for (const disps of this.model_listeners.values())
      disps.forEach((d) => d.dispose());
    this.model_listeners.clear();
    for (const t of this.model_timers.values()) clearTimeout(t);
    this.model_timers.clear();
    this.connections.clear();
    for (const ws of this.sockets.values()) {
      if (ws.readyState === WebSocket.OPEN) ws.close();
    }
    this.sockets.clear();
    for (const emitter of this.lensEmitters.values()) emitter.dispose();
    this.lensEmitters.clear();
  }

  async format_model(model: Monaco.editor.ITextModel): Promise<boolean> {
    const conn = this.connections.get(model.getLanguageId());
    if (!conn?.initialized) return false;
    try {
      await conn.ready;
      const edits = (await send_request(
        conn,
        DocumentFormattingRequest.type.method,
        {
          textDocument: { uri: normalize_uri(model_uri(model)) },
          options: {
            tabSize: model.getOptions().tabSize,
            insertSpaces: model.getOptions().insertSpaces ?? true,
          },
        },
      )) as Array<{
        range: {
          start: { line: number; character: number };
          end: { line: number; character: number };
        };
        newText: string;
      }> | null;
      if (!edits?.length) return false;
      apply_lsp_edits(model, edits);
      return true;
    } catch (e) {
      console.error("[relay:client] format_model error", e);
      return false;
    }
  }

  
  
  
  
  private conn_for_model(
    model: Monaco.editor.ITextModel,
  ): LspConnection | null {
    for (const def of this.definitions) {
      if (this.model_matches(model, def)) {
        return this.connections.get(def.languageId) ?? null;
      }
    }
    return null;
  }

  private async ready_conn(
    model: Monaco.editor.ITextModel,
  ): Promise<LspConnection | null> {
    const conn = this.conn_for_model(model);
    if (!conn?.initialized) return null;
    await conn.ready;
    return conn;
  }

  private async request_at(
    model: Monaco.editor.ITextModel,
    method: string,
    position: { line: number; character: number },
    extra: Record<string, unknown> = {},
  ): Promise<unknown> {
    const conn = await this.ready_conn(model);
    if (!conn) return null;
    try {
      return await send_request(conn, method, {
        textDocument: { uri: normalize_uri(model_uri(model)) },
        position,
        ...extra,
      });
    } catch (e) {
      console.error(`[relay:client] ${method} error`, e);
      return null;
    }
  }

  /** LSP position is 0-based { line, character }. */
  lsp_hover(
    model: Monaco.editor.ITextModel,
    position: { line: number; character: number },
  ): Promise<unknown> {
    return this.request_at(model, HoverRequest.type.method, position);
  }

  lsp_definition(
    model: Monaco.editor.ITextModel,
    position: { line: number; character: number },
  ): Promise<unknown> {
    return this.request_at(model, DefinitionRequest.type.method, position);
  }

  lsp_references(
    model: Monaco.editor.ITextModel,
    position: { line: number; character: number },
  ): Promise<unknown> {
    return this.request_at(model, ReferencesRequest.type.method, position, {
      context: { includeDeclaration: true },
    });
  }

  async lsp_document_symbols(
    model: Monaco.editor.ITextModel,
  ): Promise<unknown> {
    const conn = await this.ready_conn(model);
    if (!conn) return null;
    try {
      return await send_request(conn, "textDocument/documentSymbol", {
        textDocument: { uri: normalize_uri(model_uri(model)) },
      });
    } catch (e) {
      console.error("[relay:client] documentSymbol error", e);
      return null;
    }
  }

  private connect(def: LspClientDefinition, port: number): void {
    const existing = this.sockets.get(def.languageId);
    if (existing) {
      existing.close();
      this.sockets.delete(def.languageId);
      this.connections.delete(def.languageId);
    }

    const workspacePath = uri_to_path(this.workspaceUri);
    const url = `ws://127.0.0.1:${port}/${def.languageId}?workspace=${encodeURIComponent(workspacePath)}`;
    const ws = new WebSocket(url);
    this.sockets.set(def.languageId, ws);
    const monaco = this.monaco;

    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      console.log("[raw]", JSON.stringify(m).slice(0, 300));
    };

    ws.onopen = async () => {
      const socket = toSocket(ws);
      const reader = new WebSocketMessageReader(socket);
      const writer = new WebSocketMessageWriter(socket);
      const { ready, markReady } = make_ready_promise();

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

      reader.listen((msg: unknown) => {
        const m = msg as Record<string, unknown>;
        if (m["id"] != null && "method" in m) {
          this.handle_server_request(conn, m);
          return;
        }
        if (m["id"] != null && !("method" in m)) {
          const id =
            typeof m["id"] === "string"
              ? parseInt(m["id"], 10)
              : (m["id"] as number);
          const p = conn.pending.get(id);
          if (p) {
            conn.pending.delete(id);
            if (m["error"]) p.reject(m["error"]);
            else p.resolve(m["result"]);
          } else {
            console.warn(`[relay:client] no pending handler for id=${m["id"]}`);
          }
          return;
        }
        if ("method" in m) this.handle_notification(def, conn, m);
      });

      await send_request(conn, InitializeRequest.type.method, {
        processId: null,
        clientInfo: { name: "relay-client" },
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
                resolveSupport: {
                  properties: [
                    "documentation",
                    "detail",
                    "additionalTextEdits",
                  ],
                },
              },
              contextSupport: true,
            },
            hover: { contentFormat: ["plaintext", "markdown"] },
            signatureHelp: {
              signatureInformation: {
                documentationFormat: ["plaintext", "markdown"],
              },
            },
            formatting: { dynamicRegistration: false },
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
      conn.initialized = true;

      const provider_disps = this.register_providers(def, conn);
      this.disposables.set(def.languageId, provider_disps);

      for (const model of monaco.editor.getModels()) {
        if (this.model_matches(model, def)) {
          this.did_open(conn, model);
          this.bind_model(def, conn, model);
        }
      }

      const create_disp = monaco.editor.onDidCreateModel((model) => {
        if (!this.model_matches(model, def)) return;
        const c = this.connections.get(def.languageId);
        if (!c?.initialized) return;
        this.did_open(c, model);
        this.bind_model(def, c, model);
      });
      provider_disps.push(create_disp);
    };

    ws.onerror = (e) =>
      console.error(`[relay:client:${def.languageId}] ws error`, e);
    ws.onclose = () => {
      this.sockets.delete(def.languageId);
      this.connections.delete(def.languageId);
    };
  }

  private bind_model(
    def: LspClientDefinition,
    _: LspConnection,
    model: Monaco.editor.ITextModel,
  ): void {
    const key = model.uri.toString();
    if (this.model_listeners.has(key)) return;

    const d1 = model.onDidChangeContent(() => {
      const c = this.connections.get(def.languageId);
      if (!c?.initialized) return;
      const uri = normalize_uri(model_uri(model));
      this.monaco.editor.setModelMarkers(model, def.languageId, []);
      const existing = this.model_timers.get(key);
      if (existing) clearTimeout(existing);
      this.model_timers.set(
        key,
        setTimeout(() => {
          this.model_timers.delete(key);
          send_notification(c, DidChangeTextDocumentNotification.type.method, {
            textDocument: { uri, version: model.getVersionId() },
            contentChanges: [{ text: model.getValue() }],
          });
        }, 150),
      );
    });

    const d2 = model.onWillDispose(() => {
      const c = this.connections.get(def.languageId);
      if (c) this.did_close(c, model);
      const t = this.model_timers.get(key);
      if (t) {
        clearTimeout(t);
        this.model_timers.delete(key);
      }
      this.model_listeners.get(key)?.forEach((d) => d.dispose());
      this.model_listeners.delete(key);
    });

    this.model_listeners.set(key, [d1, d2]);
  }

  private handle_server_request(
    conn: LspConnection,
    msg: Record<string, unknown>,
  ): void {
    const method = msg["method"] as string;
    const params = msg["params"] as Record<string, unknown> | undefined;

    
    if (method === "workspace/configuration") {
      const items = (params?.["items"] as Array<Record<string, unknown>>) ?? [];
      
      const result = items.map(() => ({}));
      conn.writer.write({ jsonrpc: "2.0", id: msg["id"], result } as never);
      return;
    }

    
    if (method === "workspace/workspaceFolders") {
      conn.writer.write({
        jsonrpc: "2.0",
        id: msg["id"],
        result: [{ uri: this.workspaceUri, name: "workspace" }],
      } as never);
      return;
    }

    
    conn.writer.write({ jsonrpc: "2.0", id: msg["id"], result: null } as never);
  }

  private handle_notification(
    def: LspClientDefinition,
    conn: LspConnection,
    msg: Record<string, unknown>,
  ): void {
    if (msg["method"] === "$/progress") {
      if (
        (msg["params"] as Record<string, unknown> | undefined)?.["value"] as
          | Record<string, unknown>
          | undefined
      ) {
        const value = (msg["params"] as Record<string, unknown>)[
          "value"
        ] as Record<string, unknown>;
        if (value["kind"] === "end") conn.markReady();
      }
      return;
    }

    if (msg["method"] === PublishDiagnosticsNotification.type.method) {
      const { uri, diagnostics } = msg["params"] as {
        uri: string;
        diagnostics: Record<string, unknown>[];
      };
      conn.markReady();

      const target = canonical_uri(uri);
      const model = this.monaco.editor
        .getModels()
        .find((m) => canonical_uri(model_uri(m)) === target);
      if (!model) return;

      this.monaco.editor.setModelMarkers(
        model,
        def.languageId,
        diagnostics.map((d) => {
          const range = d["range"] as {
            start: { line: number; character: number };
            end: { line: number; character: number };
          };
          return {
            startLineNumber: range.start.line + 1,
            startColumn: range.start.character + 1,
            endLineNumber: range.end.line + 1,
            endColumn: range.end.character + 1,
            message: d["message"] as string,
            severity: lsp_severity_to_monaco(
              d["severity"] as any | undefined,
              this.monaco,
            ),
            source: d["source"] as string | undefined,
          };
        }),
      );

      this.fire_lens_emitter(def.languageId);
    }
  }

  private did_open(conn: LspConnection, model: Monaco.editor.ITextModel): void {
    send_notification(conn, DidOpenTextDocumentNotification.type.method, {
      textDocument: {
        uri: normalize_uri(model_uri(model)),
        languageId: lsp_language_id(model),
        version: model.getVersionId(),
        text: model.getValue(),
      },
    });
  }

  private did_close(
    conn: LspConnection,
    model: Monaco.editor.ITextModel,
  ): void {
    send_notification(conn, DidCloseTextDocumentNotification.type.method, {
      textDocument: { uri: normalize_uri(model_uri(model)) },
    });
  }

  private register_providers(
    def: LspClientDefinition,
    _conn: LspConnection,
  ): Monaco.IDisposable[] {
    const exts = def.extensions ?? [def.languageId];
    const selector: Monaco.languages.LanguageSelector = [
      def.languageId,
      ...exts.map((ext) => ({ pattern: `**/*.${ext}` })),
    ];
    const disps: Monaco.IDisposable[] = [];
    const monaco = this.monaco;
    const getConn = (): LspConnection | null =>
      this.connections.get(def.languageId) ?? null;

    const emitter = new monaco.Emitter<Monaco.languages.CodeLensProvider>();
    this.lensEmitters.set(def.languageId, emitter);
    disps.push(emitter);

    const lensDataMap = new Map<
      string,
      Map<
        string,
        {
          model: Monaco.editor.ITextModel;
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
            const symbols = (await send_request(
              conn,
              "textDocument/documentSymbol",
              { textDocument: { uri } },
            )) as unknown[] | null;
            if (!symbols) return { lenses: [], dispose: () => {} };

            const fileMap = new Map<
              string,
              {
                model: Monaco.editor.ITextModel;
                pos: { line: number; character: number };
              }
            >();
            lensDataMap.set(uri, fileMap);
            const lenses: Monaco.languages.CodeLens[] = [];
            const SYMBOL_KINDS_WITH_REFS = new Set([5, 6, 9, 12]);

            function collect(syms: unknown[]) {
              for (const sym of syms) {
                const s = sym as Record<string, unknown>;
                if (SYMBOL_KINDS_WITH_REFS.has(s["kind"] as number)) {
                  const range = (s["range"] ??
                    (s["location"] as Record<string, unknown> | undefined)?.[
                      "range"
                    ]) as
                    | {
                        start: { line: number; character: number };
                        end: { line: number; character: number };
                      }
                    | undefined;
                  if (!range) {
                    if ((s["children"] as unknown[] | undefined)?.length)
                      collect(s["children"] as unknown[]);
                    continue;
                  }
                  const pos = get_name_position(model, s);
                  const id = `${s["name"] as string}:${pos.line}:${pos.character}`;
                  fileMap.set(id, { model, pos });
                  const lens = {
                    range: to_monaco_range(range),
                  } as Monaco.languages.CodeLens;
                  (lens as unknown as Record<string, unknown>)["_id"] = id;
                  lenses.push(lens);
                }
                if ((s["children"] as unknown[] | undefined)?.length)
                  collect(s["children"] as unknown[]);
              }
            }

            collect(Array.isArray(symbols) ? symbols : [symbols]);
            return { lenses, dispose: () => {} };
          } catch (err) {
            console.error("[relay:client] provideCodeLenses error", err);
            return { lenses: [], dispose: () => {} };
          }
        },
        async resolveCodeLens(model, lens) {
          const conn = getConn();
          const noop: Monaco.languages.Command = { id: "", title: "0 usages" };
          if (!conn) {
            lens.command = noop;
            return lens;
          }
          const uri = normalize_uri(model_uri(model));
          const id = (lens as unknown as Record<string, unknown>)["_id"] as
            | string
            | undefined;
          const data = id ? lensDataMap.get(uri)?.get(id) : undefined;
          if (!data) {
            lens.command = noop;
            return lens;
          }
          try {
            const refs = (await send_request(
              conn,
              ReferencesRequest.type.method,
              {
                textDocument: { uri },
                position: data.pos,
                context: { includeDeclaration: false },
              },
            )) as unknown[] | null;
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
          } catch {
            lens.command = noop;
            return lens;
          }
        },
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
            const result = (await send_request(
              conn,
              CompletionRequest.type.method,
              {
                textDocument: { uri: normalize_uri(model_uri(model)) },
                position: to_lsp_position(position, model),
                context: to_lsp_completion_context(context),
              },
            )) as
              | { items?: unknown[]; isIncomplete?: boolean }
              | unknown[]
              | null;
            if (!result) return null;
            const items = Array.isArray(result)
              ? result
              : ((result as { items?: unknown[] }).items ?? []);
            return {
              suggestions: items.map((item) =>
                lsp_completion_to_monaco(
                  item as Record<string, unknown>,
                  model,
                  position,
                  monaco,
                ),
              ),
              incomplete:
                (result as { isIncomplete?: boolean }).isIncomplete ?? false,
            };
          } catch {
            return null;
          }
        },
        async resolveCompletionItem(item) {
          const conn = getConn();
          const raw = (item as { __lsp_item?: Record<string, unknown> })
            .__lsp_item;
          if (!conn?.initialized || !raw) return item;
          try {
            const resolved = (await send_request(
              conn,
              CompletionResolveRequest.type.method,
              raw,
            )) as Record<string, unknown> | null;
            if (!resolved) return item;
            const edits = resolved.additionalTextEdits as
              | Array<{
                  range: {
                    start: { line: number; character: number };
                    end: { line: number; character: number };
                  };
                  newText: string;
                }>
              | undefined;
            if (edits?.length) {
              item.additionalTextEdits = edits.map((e) => ({
                range: to_monaco_range(e.range),
                text: e.newText,
              }));
            }
            if (resolved.detail) item.detail = resolved.detail as string;
            if (resolved.documentation) {
              item.documentation = {
                value:
                  typeof resolved.documentation === "string"
                    ? resolved.documentation
                    : ((resolved.documentation as { value?: string }).value ??
                      ""),
              };
            }
          } catch {
            /* keep the unresolved item */
          }
          return item;
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
            const result = (await send_request(conn, HoverRequest.type.method, {
              textDocument: { uri: normalize_uri(model_uri(model)) },
              position: to_lsp_position(position, model),
            })) as {
              contents: unknown;
              range?: {
                start: { line: number; character: number };
                end: { line: number; character: number };
              };
            } | null;
            if (!result?.contents) return null;
            const contents = Array.isArray(result.contents)
              ? result.contents
              : [result.contents];
            return {
              contents: contents.map((c: unknown) => ({
                value:
                  typeof c === "string"
                    ? c
                    : ((c as { value?: string }).value ?? ""),
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
            const result = (await send_request(
              conn,
              SignatureHelpRequest.type.method,
              {
                textDocument: { uri: normalize_uri(model_uri(model)) },
                position: to_lsp_position(position, model),
              },
            )) as {
              signatures: unknown[];
              activeSignature?: number;
              activeParameter?: number;
            } | null;
            if (!result?.signatures?.length) return null;
            return {
              value: {
                signatures: result.signatures.map((s: unknown) => {
                  const sig = s as Record<string, unknown>;
                  return {
                    label: sig["label"] as string,
                    documentation: sig["documentation"]
                      ? {
                          value:
                            typeof sig["documentation"] === "string"
                              ? sig["documentation"]
                              : (sig["documentation"] as { value: string })
                                  .value,
                        }
                      : undefined,
                    parameters: ((sig["parameters"] as unknown[]) ?? []).map(
                      (p: unknown) => {
                        const param = p as Record<string, unknown>;
                        return {
                          label: param["label"] as string,
                          documentation: param["documentation"]
                            ? {
                                value:
                                  typeof param["documentation"] === "string"
                                    ? param["documentation"]
                                    : (
                                        param["documentation"] as {
                                          value: string;
                                        }
                                      ).value,
                              }
                            : undefined,
                        };
                      },
                    ),
                  };
                }),
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
            const result = (await send_request(
              conn,
              DefinitionRequest.type.method,
              {
                textDocument: { uri: normalize_uri(model_uri(model)) },
                position: to_lsp_position(position, model),
              },
            )) as unknown[] | null;
            if (!result) return null;
            const locs = Array.isArray(result) ? result : [result];
            return locs.map((loc: unknown) => {
              const l = loc as {
                uri: string;
                range: {
                  start: { line: number; character: number };
                  end: { line: number; character: number };
                };
              };
              return {
                uri: monaco.Uri.parse(l.uri),
                range: to_monaco_range(l.range),
              };
            });
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
            const result = (await send_request(
              conn,
              ReferencesRequest.type.method,
              {
                textDocument: { uri: normalize_uri(model_uri(model)) },
                position: to_lsp_position(position, model),
                context: { includeDeclaration: true },
              },
            )) as unknown[] | null;
            if (!result) return null;
            return result.map((loc: unknown) => {
              const l = loc as {
                uri: string;
                range: {
                  start: { line: number; character: number };
                  end: { line: number; character: number };
                };
              };
              return {
                uri: monaco.Uri.parse(l.uri),
                range: to_monaco_range(l.range),
              };
            });
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
            const edits = (await send_request(
              conn,
              DocumentFormattingRequest.type.method,
              {
                textDocument: { uri: normalize_uri(model_uri(model)) },
                options: {
                  tabSize: model.getOptions().tabSize,
                  insertSpaces: model.getOptions().insertSpaces ?? true,
                },
              },
            )) as Array<{
              range: {
                start: { line: number; character: number };
                end: { line: number; character: number };
              };
              newText: string;
            }> | null;
            if (!edits?.length) return [];
            return edits.map((e) => ({
              range: to_monaco_range(e.range),
              text: e.newText,
            }));
          } catch (err) {
            console.error(
              "[relay:client] provideDocumentFormattingEdits error",
              err,
            );
            return [];
          }
        },
      }),
    );

    return disps;
  }

  private model_matches(
    model: Monaco.editor.ITextModel,
    def: LspClientDefinition,
  ): boolean {
    const lang = model.getLanguageId();
    if (lang === def.languageId) return true;
    const exts = def.extensions ?? [def.languageId];
    return exts.some((ext) => model.uri.path.endsWith(`.${ext}`));
  }
}
