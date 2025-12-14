import monaco from "../../../common/utils.js";
import "../../../common/icons.js";
import {
  CloseAction,
  createConnection,
  ErrorAction,
  MonacoLanguageClient,
  MonacoServices,
} from "monaco-languageclient";
import { listen } from "@codingame/monaco-jsonrpc";
import { registerTheme } from "../../../common/theme.js";
import { getLanguage } from "../../../../workbench/common/utils.js";
import { getLanguageServer } from "../../../../platform/editor/languages.js";
import { _clients } from "../../../common/langserver.js";

const path = window.path;

MonacoServices.install(monaco as any);

export class CellEditor {
  public _editor!: monaco.editor.IStandaloneCodeEditor;

  private _models = new Map<string, monaco.editor.ITextModel>();

  private _mounted = false;
  private _registeredProviders = new Map<string, monaco.IDisposable>();

  constructor(private _layout: HTMLDivElement) {
    registerTheme(monaco);
  }

  private _normalizePath(p: string) {
    return p.toLowerCase().replace(/\//g, "\\");
  }

  private _ensure() {
    const editorElement = this._layout.querySelector(".monaco-editor");
    const needsMount = !this._editor || !this._mounted || !editorElement;

    if (needsMount) {
      this._mount();
    }
  }

  _mount() {
    if (this._editor) {
      try {
        this._editor.dispose();
      } catch (e) {}
    }

    this._editor = monaco.editor.create(this._layout, {
      theme: "meridia-theme",
      fontSize: 20,
      fontFamily: "Jetbrains Mono",
      cursorBlinking: "smooth",
      cursorSmoothCaretAnimation: true,
      minimap: { enabled: false },
      renderWhitespace: "none",
      fixedOverflowWidgets: true,
      links: true,
      linkedEditing: true,
      dragAndDrop: true,
      renderLineHighlight: "all",
      renderLineHighlightOnlyWhenFocus: false,
      largeFileOptimizations: true,
      formatOnPaste: true,
      overviewRulerBorder: false,
      useShadowDOM: false,
      codeLens: true,
      scrollBeyondLastLine: false,
      wordWrap: "on",
    });

    this._mounted = true;
  }

  private async _setupClientForLanguage(extension: string) {
    const port = getLanguageServer(extension);

    if (!port) {
      return;
    }
    if (_clients.has(port)) {
      return;
    }

    try {
      const webSocket = new WebSocket(`ws://localhost:${port}`);

      listen({
        webSocket,
        onConnection: (connection) => {
          const monacoLanguageId = getLanguage(extension);

          const client = new MonacoLanguageClient({
            name: `Language Client for ${extension} (port ${port})`,
            clientOptions: {
              documentSelector: [{ language: monacoLanguageId }],
              errorHandler: {
                error: () => ErrorAction.Continue,
                closed: () => CloseAction.DoNotRestart,
              },
              initializationOptions: {
                pylsp: {
                  plugins: {
                    pyflakes: { enabled: true },
                    pycodestyle: { enabled: false },
                    pydocstyle: { enabled: false },
                  },
                },
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
              this._editor.updateOptions({ readOnly: false });
            })
            .catch((error) => {
              this._editor.updateOptions({ readOnly: false });
            });

          try {
            const disposable = client.start();
            connection.onClose(() => {
              disposable.dispose();
              _clients.delete(port);
            });
            _clients.set(port, client);
          } catch (error) {}
        },
      });
    } catch (error) {
      this._editor.updateOptions({ readOnly: false });
    }
  }

  async _open(_uri: string, content: string) {
    this._ensure();

    const key = this._normalizePath(_uri);
    let model = this._models.get(key);

    if (!model || model.isDisposed()) {
      if (model && model.isDisposed()) {
        this._models.delete(key);
        model = undefined;
      }

      const uri = monaco.Uri.file(_uri);
      const extension = path.extname(_uri).substring(1);
      const monacoLanguageId = getLanguage(extension);

      const existingModel = monaco.editor.getModel(uri);
      if (existingModel && !existingModel.isDisposed()) {
        model = existingModel;
      } else {
        model = monaco.editor.createModel(content, monacoLanguageId, uri);
      }

      this._models.set(key, model);

      setTimeout(async () => {
        await this._setupClientForLanguage(extension);
      }, 1000);
    }

    if (!model.isDisposed()) {
      this._editor.setModel(model);
      this._editor.focus();
    }

    return model;
  }

  async restart(extension: string) {
    _clients.forEach((client, port) => {
      try {
        client.stop();
      } catch (error) {}
    });
    _clients.clear();

    await this._setupClientForLanguage(extension);
  }

  dispose() {
    this._registeredProviders.forEach((disposable) => {
      try {
        disposable.dispose();
      } catch (error) {}
    });
    this._registeredProviders.clear();

    this._models.forEach((model) => {
      if (!model.isDisposed()) {
        model.dispose();
      }
    });
    this._models.clear();

    _clients.forEach((client) => {
      try {
        client.stop();
      } catch {}
    });
    _clients.clear();

    if (this._editor) {
      try {
        this._editor.dispose();
      } catch {}
    }

    this._mounted = false;
  }
}
