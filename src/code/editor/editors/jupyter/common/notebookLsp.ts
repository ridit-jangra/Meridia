import monaco from "../../../common/utils.js";
import {
  CloseAction,
  createConnection,
  ErrorAction,
  MonacoLanguageClient,
  MonacoServices,
} from "monaco-languageclient";
import { listen } from "@codingame/monaco-jsonrpc";
import { getLanguage } from "../../../../workbench/common/utils.js";
import { getLanguageServer } from "../../../../platform/editor/languages.js";
import { _clients } from "../../../common/langserver.js";

MonacoServices.install(monaco as any);

export const NotebookLSP = {
  sharedVirtualDocUri: monaco.Uri.file("workspace:///notebook.py"),
  sharedVirtualModel: null as monaco.editor.ITextModel | null,
  cellContents: new Map<string, { content: string; index: number }>(),
  updateTimeout: null as NodeJS.Timeout | null,
  completionProviderRegistered: false,
  lspPort: null as number | null,
  kernelConnection: null as any,

  initialize() {
    if (!this.sharedVirtualModel) {
      const existing = monaco.editor.getModel(this.sharedVirtualDocUri);
      if (existing && !existing.isDisposed()) {
        this.sharedVirtualModel = existing;
      } else {
        this.sharedVirtualModel = monaco.editor.createModel(
          "",
          "python",
          this.sharedVirtualDocUri
        );
      }
    }
  },

  setKernelConnection(connection: any) {
    this.kernelConnection = connection;
  },

  registerCell(cellId: string, content: string, index: number) {
    this.cellContents.set(cellId, { content, index });
    this.scheduleUpdate();
  },

  updateCell(cellId: string, content: string) {
    const existing = this.cellContents.get(cellId);
    if (existing) {
      existing.content = content;
      this.scheduleUpdate();
    }
  },

  removeCell(cellId: string) {
    this.cellContents.delete(cellId);
    this.scheduleUpdate();
  },

  updateCellIndex(cellId: string, newIndex: number) {
    const existing = this.cellContents.get(cellId);
    if (existing) {
      existing.index = newIndex;
      this.scheduleUpdate();
    }
  },

  scheduleUpdate() {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    this.updateTimeout = setTimeout(() => {
      this.updateVirtualDocument();
    }, 150);
  },

  updateVirtualDocument() {
    if (!this.sharedVirtualModel || this.sharedVirtualModel.isDisposed()) {
      return;
    }

    const sortedCells = Array.from(this.cellContents.entries()).sort(
      (a, b) => a[1].index - b[1].index
    );

    const combinedContent = sortedCells
      .map(([cellId, data]) => data.content)
      .join("\n\n");

    const oldValue = this.sharedVirtualModel.getValue();
    if (oldValue !== combinedContent) {
      this.sharedVirtualModel.setValue(combinedContent);

      if (this.lspPort) {
        const client = _clients.get(this.lspPort);
        if (client) {
          try {
            client.sendNotification("textDocument/didChange", {
              textDocument: {
                uri: this.sharedVirtualDocUri.toString(),
                version: Date.now(),
              },
              contentChanges: [{ text: combinedContent }],
            });
          } catch (error) {
            console.error("LSP update failed:", error);
          }
        }
      }
    }
  },

  async getKernelCompletions(code: string, cursorPos: number): Promise<any[]> {
    if (!this.kernelConnection || !this.kernelConnection.kernel) {
      return [];
    }

    try {
      const kernel = this.kernelConnection.kernel;

      const reply = await kernel.requestComplete({
        code: code,
        cursor_pos: cursorPos,
      });

      if (reply.content.status === "ok" && reply.content.matches) {
        return reply.content.matches.map((match: string) => ({
          label: match,
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: match,
          detail: "from kernel",
          sortText: `0_${match}`,
        }));
      }
    } catch (error) {
      console.error("Kernel completion failed:", error);
    }

    return [];
  },

  async getLSPCompletions(
    virtualModel: monaco.editor.ITextModel,
    virtualLine: number,
    virtualColumn: number,
    lspPort: number
  ): Promise<any[]> {
    const client = _clients.get(lspPort);
    if (!client) {
      return [];
    }

    try {
      const currentContent = virtualModel.getValue();
      await client.sendNotification("textDocument/didChange", {
        textDocument: {
          uri: virtualModel.uri.toString(),
          version: Date.now(),
        },
        contentChanges: [{ text: currentContent }],
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      const response = (await client.sendRequest("textDocument/completion", {
        textDocument: {
          uri: virtualModel.uri.toString(),
        },
        position: {
          line: virtualLine - 1,
          character: virtualColumn - 1,
        },
      })) as any;

      if (response && response.items) {
        return response.items;
      }
    } catch (error) {
      console.error("LSP completion failed:", error);
    }

    return [];
  },

  mergeSuggestions(
    kernelItems: any[],
    lspItems: any[],
    model: monaco.editor.ITextModel,
    position: monaco.Position
  ): monaco.languages.CompletionItem[] {
    const wordInfo = model.getWordUntilPosition(position);
    const range = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: wordInfo.startColumn,
      endColumn: wordInfo.endColumn,
    };

    const seen = new Set<string>();
    const merged: monaco.languages.CompletionItem[] = [];

    for (const item of kernelItems) {
      if (!seen.has(item.label)) {
        seen.add(item.label);
        merged.push({ ...item, range });
      }
    }

    const kindMap: { [key: number]: monaco.languages.CompletionItemKind } = {
      1: monaco.languages.CompletionItemKind.Text,
      2: monaco.languages.CompletionItemKind.Method,
      3: monaco.languages.CompletionItemKind.Function,
      4: monaco.languages.CompletionItemKind.Constructor,
      5: monaco.languages.CompletionItemKind.Field,
      6: monaco.languages.CompletionItemKind.Variable,
      7: monaco.languages.CompletionItemKind.Class,
      8: monaco.languages.CompletionItemKind.Interface,
      9: monaco.languages.CompletionItemKind.Module,
      10: monaco.languages.CompletionItemKind.Property,
      14: monaco.languages.CompletionItemKind.Keyword,
    };

    for (const item of lspItems) {
      if (!seen.has(item.label)) {
        seen.add(item.label);
        merged.push({
          label: item.label,
          kind: kindMap[item.kind] || monaco.languages.CompletionItemKind.Text,
          insertText: item.insertText || item.label,
          detail: item.detail,
          documentation: item.documentation
            ? typeof item.documentation === "string"
              ? item.documentation
              : item.documentation.value
            : undefined,
          sortText: item.sortText || `1_${item.label}`,
          filterText: item.filterText,
          range: range,
        });
      }
    }

    return merged;
  },

  ensureLSPCompletionProvider(lspPort: number) {
    if (this.completionProviderRegistered) {
      return;
    }

    this.lspPort = lspPort;

    monaco.languages.registerCompletionItemProvider("python", {
      triggerCharacters: [".", " ", "("],

      provideCompletionItems: async (model, position, context, token) => {
        const cellId = (model as any)._cellId;
        const virtualModel = NotebookLSP.sharedVirtualModel;

        if (!cellId || !virtualModel || virtualModel.isDisposed()) {
          return { suggestions: [] };
        }

        const cellData = NotebookLSP.cellContents.get(cellId);
        if (!cellData) {
          return { suggestions: [] };
        }

        const sortedCells = Array.from(NotebookLSP.cellContents.entries()).sort(
          (a, b) => a[1].index - b[1].index
        );

        let lineOffset = 0;
        let totalContent = "";

        for (const [id, data] of sortedCells) {
          if (id === cellId) {
            break;
          }
          totalContent += data.content + "\n\n";
          lineOffset += data.content.split("\n").length + 2;
        }

        const currentCellLines = model.getValue().split("\n");
        const contentBeforeCursor = currentCellLines
          .slice(0, position.lineNumber)
          .join("\n");

        totalContent += contentBeforeCursor.substring(
          0,
          model.getOffsetAt(position)
        );

        const virtualLine = lineOffset + position.lineNumber;
        const virtualColumn = position.column;
        const cursorOffset = totalContent.length;

        const kernelPromise = Promise.race([
          NotebookLSP.getKernelCompletions(totalContent, cursorOffset),
          new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 600)),
        ]);

        const lspPromise = NotebookLSP.getLSPCompletions(
          virtualModel,
          virtualLine,
          virtualColumn,
          lspPort
        );

        const [kernelItems, lspItems] = await Promise.all([
          kernelPromise,
          lspPromise,
        ]);

        const merged = NotebookLSP.mergeSuggestions(
          kernelItems,
          lspItems,
          model,
          position
        );

        return { suggestions: merged };
      },
    });

    this.completionProviderRegistered = true;
  },

  async ensureLSPClient(extension: string) {
    const port = getLanguageServer(extension);

    if (!port) {
      return;
    }

    if (_clients.has(port)) {
      this.ensureLSPCompletionProvider(port);
      return;
    }

    try {
      const webSocket = new WebSocket(`ws://localhost:${port}`);

      webSocket.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      listen({
        webSocket,
        onConnection: (connection) => {
          const monacoLanguageId = getLanguage(extension);

          const client = new MonacoLanguageClient({
            name: `Notebook Language Client (port ${port})`,
            clientOptions: {
              documentSelector: [{ language: monacoLanguageId }],
              errorHandler: {
                error: () => ErrorAction.Continue,
                closed: () => CloseAction.DoNotRestart,
              },
              initializationOptions: {
                pylsp: {
                  plugins: {
                    jedi: {
                      enabled: true,
                      environment: null,
                      extra_paths: [],
                    },
                    jedi_completion: {
                      enabled: true,
                      include_params: true,
                      include_class_objects: true,
                      fuzzy: true,
                      eager: false,
                      resolve_at_most: 25,
                      cache_for: ["pandas", "numpy", "matplotlib"],
                    },
                    jedi_hover: { enabled: true },
                    jedi_references: { enabled: true },
                    jedi_signature_help: { enabled: true },
                    jedi_symbols: { enabled: true, all_scopes: true },
                    pyflakes: { enabled: false },
                    pycodestyle: { enabled: false },
                    pydocstyle: { enabled: false },
                    autopep8: { enabled: false },
                    yapf: { enabled: false },
                    pylint: { enabled: false },
                  },
                },
              },
              workspaceFolder: {
                uri: "file:///notebook-workspace",
                name: "notebook",
                index: 0,
              },
            },
            connectionProvider: {
              get: (errorHandler, closeHandler) =>
                Promise.resolve(
                  createConnection(connection, errorHandler, closeHandler)
                ),
            },
          });

          client
            .onReady()
            .then(() => {
              const virtualModel = NotebookLSP.sharedVirtualModel;
              if (virtualModel && !virtualModel.isDisposed()) {
                try {
                  client.sendNotification("textDocument/didOpen", {
                    textDocument: {
                      uri: virtualModel.uri.toString(),
                      languageId: "python",
                      version: 1,
                      text: virtualModel.getValue(),
                    },
                  });
                } catch (error) {
                  console.error("didOpen notification failed:", error);
                }
              }

              NotebookLSP.ensureLSPCompletionProvider(port);
            })
            .catch((error) => {
              console.error("Client initialization failed:", error);
            });

          try {
            const disposable = client.start();

            connection.onClose(() => {
              disposable.dispose();
              _clients.delete(port);
            });

            _clients.set(port, client);
          } catch (error) {
            console.error("Client start failed:", error);
          }
        },
      });
    } catch (error) {
      console.error("LSP connection failed:", error);
    }
  },

  restart(extension: string) {
    _clients.forEach((client, port) => {
      try {
        client.stop();
      } catch (error) {}
    });
    _clients.clear();

    this.completionProviderRegistered = false;
    this.ensureLSPClient(extension);
  },

  dispose() {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    if (this.sharedVirtualModel && !this.sharedVirtualModel.isDisposed()) {
      this.sharedVirtualModel.dispose();
    }
    this.cellContents.clear();
    this.kernelConnection = null;
  },
};

NotebookLSP.initialize();
