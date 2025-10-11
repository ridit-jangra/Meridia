import * as monaco from "monaco-editor";
import "./workbench.monaco.icons.js";
import "monaco-languages";
import {
  CloseAction,
  createConnection,
  ErrorAction,
  MonacoLanguageClient,
  MonacoServices,
} from "monaco-languageclient";
import { listen } from "@codingame/monaco-jsonrpc";
import { IEditorTab } from "../../workbench.types.js";
import { registerStandalone } from "../workbench.standalone.js";
import { dispatch } from "../workbench.store/workbench.store.js";
import { update_editor_tabs } from "../workbench.store/workbench.store.slice.js";
import { select } from "../workbench.store/workbench.store.selector.js";
import { registerTheme } from "./workbench.editor.theme.js";
import { registerFsSuggestion } from "./workbench.editor.utils.js";
import {
  getLanguageServer,
  languages,
} from "../../../platform/editor/editor.languages.js";

const fs = window.fs;
const path = window.path;
const python = window.python;

Object.assign(window, {
  MonacoEnvironment: {
    getWorker(_moduleId: string, label: string) {
      const base = "/workers/";
      const workers: any = {
        json: "json.worker.js",
        css: "css.worker.js",
        html: "html.worker.js",
        typescript: "ts.worker.js",
        javascript: "ts.worker.js",
      };
      return new Worker(`${base}${workers[label] || "editor.worker.js"}`, {
        type: "module",
      });
    },
  },
});

MonacoServices.install(monaco as any);

export class Editor {
  private _tabs: IEditorTab[] = [];
  public _editor!: monaco.editor.IStandaloneCodeEditor;
  private _layout = document.querySelector(".editor-area") as HTMLElement;

  private _clients = new Map<number, MonacoLanguageClient>();
  private _models = new Map<string, monaco.editor.ITextModel>();
  private _watchers = new Map<string, any>();
  private _updating = false;
  private _saveActionDisposable?: monaco.IDisposable;
  private _mounted = false;
  private _registeredProviders = new Map<string, monaco.IDisposable>();
  private _isProvidersRegistered = false;

  constructor() {
    registerTheme(monaco);

    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      noLib: true,
      allowNonTsExtensions: true,
    });

    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      noLib: true,
      allowNonTsExtensions: true,
    });

    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: true,
    });

    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: true,
    });

    this._registerProviders();
    this._hoverProvider();
  }

  private _normalizePath(p: string) {
    return p.toLowerCase().replace(/\//g, "\\");
  }

  private _getMonacoLanguageId(extension: string): string {
    const languageMap: { [key: string]: string } = {
      py: "python",
      js: "javascript",
      ts: "typescript",
      json: "json",
      html: "html",
      css: "css",
      scss: "scss",
      less: "less",
      xml: "xml",
      yaml: "yaml",
      yml: "yaml",
      md: "markdown",
      txt: "plaintext",
      java: "java",
      cpp: "cpp",
      c: "c",
      h: "c",
      hpp: "cpp",
      rs: "rust",
      go: "go",
      php: "php",
      rb: "ruby",
      sh: "shell",
      bat: "bat",
      ps1: "powershell",
    };
    return languageMap[extension] || "plaintext";
  }

  private _registerProviders() {
    if (this._isProvidersRegistered) return;

    try {
      const fsProvider = registerFsSuggestion(monaco);
      if (fsProvider) {
        this._registeredProviders.set("fs-suggestion", fsProvider);
      }

      this._isProvidersRegistered = true;
    } catch (error) {}
  }

  private _hoverProvider() {
    if (!this._registeredProviders.has("hover-provider")) {
      const hoverProvider = monaco.languages.registerHoverProvider("python", {
        provideHover: (model, position) => {
          const word = model.getWordAtPosition(position);
          if (!word) return null;

          const lineText = model.getLineContent(position.lineNumber);
          const beforeWord = lineText.substring(0, word.startColumn - 1);
          const afterWord = lineText.substring(word.endColumn - 1);

          return {
            range: new monaco.Range(
              position.lineNumber,
              word.startColumn,
              position.lineNumber,
              word.endColumn
            ),
            contents: [
              { value: `**Symbol**: ${word.word}` },
              {
                value: `**Position**: Line ${position.lineNumber}, Column ${position.column}`,
              },
              {
                value: `**Context**: ${beforeWord}**${word.word}**${afterWord}`,
              },
              { value: `**Language**: Python` },
            ],
          };
        },
      });

      this._registeredProviders.set("hover-provider", hoverProvider);
    }
  }

  private async _openFile(
    _path: string,
    position?: { line: number; column: number }
  ) {
    let cleanPath = _path;
    if (_path.startsWith("file://")) {
      cleanPath = _path.replace("file://", "");
    } else if (_path.startsWith("file:")) {
      cleanPath = _path.replace("file:", "");
    }

    const stateValue = select((s) => s.main.editor_tabs);
    const _uri = path.normalize(cleanPath);

    let currentTabs: IEditorTab[] = [];

    if (Array.isArray(stateValue)) {
      currentTabs = stateValue;
    } else if (stateValue && typeof stateValue === "object") {
      currentTabs = Object.values(stateValue);
    }

    const existingTabIndex = currentTabs.findIndex((tab) => tab.uri === _uri);

    if (existingTabIndex !== -1) {
      const updatedTabs = currentTabs.map((tab, index) => ({
        ...tab,
        active: index === existingTabIndex,
      }));

      dispatch(update_editor_tabs(updatedTabs));

      await this._open(updatedTabs[existingTabIndex]!);

      if (position && this._editor) {
        this._editor.setPosition({
          lineNumber: position.line,
          column: position.column,
        });
        this._editor.revealLineInCenter(position.line);
      }
    } else {
      const newTab: IEditorTab = {
        name: path.basename(_uri),
        uri: _uri,
        active: true,
        is_touched: false,
      };

      const updatedTabs = [
        ...currentTabs.map((tab) => ({
          ...tab,
          active: false,
        })),
        newTab,
      ];

      dispatch(update_editor_tabs(updatedTabs));

      await this._open(newTab);

      if (position && this._editor) {
        setTimeout(() => {
          this._editor.setPosition({
            lineNumber: position.line,
            column: position.column,
          });
          this._editor.revealLineInCenter(position.line);
        }, 100);
      }
    }
  }

  private _setupMouse() {
    if (!this._editor) return;

    const mouseDownDisposable = this._editor.onMouseDown(async (e) => {
      if (!e.event.ctrlKey && !e.event.metaKey) {
        return;
      }

      if (e.event.leftButton !== true) {
        return;
      }

      const model = this._editor.getModel();
      if (!model || !e.target.position) {
        return;
      }

      const position = e.target.position;

      try {
        const ext = model.uri.path.split(".").pop() || "";
        const port = getLanguageServer(ext);

        if (port && this._clients.has(port)) {
          const client = this._clients.get(port)!;

          const definitions = (await client.sendRequest(
            "textDocument/definition",
            {
              textDocument: { uri: model.uri.toString() },
              position: {
                line: position.lineNumber - 1,
                character: position.column - 1,
              },
            }
          )) as any[];

          if (definitions && definitions.length > 0) {
            const def = definitions[0];
            const defPosition = {
              line: def.range.start.line + 1,
              column: def.range.start.character + 1,
            };

            await this._openFile(def.uri, defPosition);
            return;
          }
        }

        const word = model.getWordAtPosition(position);
        const lineText = model.getLineContent(position.lineNumber);

        if (word && this._isFileReference(lineText, word.word)) {
          const resolvedPath = path.resolve([word.word, model.uri.fsPath]);
          if (resolvedPath) {
            await this._openFile(`file://${resolvedPath}`);
          }
        }
      } catch (error) {}
    });

    this._registeredProviders.set("mouse-down-listener", mouseDownDisposable);
  }

  private _isFileReference(lineText: string, word: string): boolean {
    if (lineText.includes("import") || lineText.includes("from")) {
      return true;
    }

    if (lineText.includes(`"${word}"`) || lineText.includes(`'${word}'`)) {
      if (word.includes("/") || word.includes("\\") || word.includes(".py")) {
        return true;
      }
    }

    return false;
  }

  private _ensure() {
    const editorElement = document.querySelector(".monaco-editor");
    const needsMount = !this._editor || !this._mounted || !editorElement;

    if (needsMount) {
      this._mount();
    }
  }

  _mount() {
    if (this._editor) {
      try {
        this._saveActionDisposable?.dispose();
        this._editor.dispose();
      } catch (e) {}
    }

    this._editor = monaco.editor.create(this._layout, {
      theme: "meridia-theme",
      automaticLayout: true,
      fontSize: 20,
      fontFamily: "Jetbrains Mono",
      cursorBlinking: "smooth",
      cursorSmoothCaretAnimation: true,
      minimap: { enabled: false },
      renderWhitespace: "selection",
      fixedOverflowWidgets: true,
      links: true,
    });

    this._mounted = true;
    this._visiblity(false);

    this._setupMouse();
    this._setupCursorTracking();
    this._saveAction();
  }

  public _visiblity(visible: boolean) {
    const editorElement = document.querySelector(
      ".monaco-editor"
    ) as HTMLDivElement;
    if (editorElement) {
      editorElement.style.display = visible ? "flex" : "none";
    }
  }

  private _saveAction() {
    this._saveActionDisposable?.dispose();
    this._saveActionDisposable = this._editor.addAction({
      id: "workbench.save",
      label: "Save File",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S],
      contextMenuGroupId: "file",
      contextMenuOrder: 1,
      run: async () => {
        const model = this._editor.getModel();
        if (model) await this._save(model.uri.fsPath);
      },
    });
  }

  private _setupCursorTracking() {
    this._editor.onDidChangeCursorPosition(async () => {
      const model = this._editor?.getModel();
      if (!model) return;

      const symbols = await this._getDocumentSymbols(
        model,
        this._editor.getPosition()?.lineNumber!
      );
      document.dispatchEvent(
        new CustomEvent("statusbar.update.referenace.path", {
          detail: { message: symbols, userId: Date.now() },
        })
      );
    });
  }

  private async _setupClientForLanguage(extension: string) {
    const port = getLanguageServer(extension);

    if (!port) {
      return;
    }
    if (this._clients.has(port)) {
      return;
    }

    try {
      const webSocket = new WebSocket(`ws://localhost:${port}`);

      listen({
        webSocket,
        onConnection: (connection) => {
          const monacoLanguageId = this._getMonacoLanguageId(extension);

          const workspaceRoot =
            select((s) => s.main.folder_structure).uri ?? "/";

          const client = new MonacoLanguageClient({
            name: `Language Client for ${extension} (port ${port})`,
            clientOptions: {
              documentSelector: [{ language: monacoLanguageId }],
              errorHandler: {
                error: () => ErrorAction.Continue,
                closed: () => CloseAction.DoNotRestart,
              },
              workspaceFolder: {
                uri: workspaceRoot,
                name: path.basename(workspaceRoot) || "workspace",
              },
              initializationOptions: this._getInitializationOptions(
                extension,
                workspaceRoot
              ),
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
              this._clients.delete(port);
            });
            this._clients.set(port, client);
          } catch (error) {}
        },
      });
    } catch (error) {
      this._editor.updateOptions({ readOnly: false });
    }
  }

  private _getInitializationOptions(extension: string, workspaceRoot: string) {
    switch (extension) {
      case "py":
        return {
          settings: {
            python: {
              analysis: {
                autoSearchPaths: true,
                useLibraryCodeForTypes: true,
                diagnosticMode: "workspace",
                typeCheckingMode: "basic",
              },
            },
          },
        };
      case "ts":
      case "js":
        return {
          preferences: {
            includeCompletionsForModuleExports: true,
            includeCompletionsWithInsertText: true,
          },
        };
      case "rs":
        return {
          linkedProjects: [path.join([workspaceRoot, "Cargo.toml"])],
          cargo: {
            buildScripts: {
              enable: true,
            },
            allTargets: true,
            autoreload: true,
          },
          procMacro: {
            enable: true,
            attributes: {
              enable: true,
            },
          },
          checkOnSave: true,
          check: {
            command: "check",
            allTargets: true,
          },
          completion: {
            autoimport: {
              enable: true,
            },
            callable: {
              snippets: "fill_arguments",
            },
          },
          inlayHints: {
            chainingHints: {
              enable: true,
            },
            parameterHints: {
              enable: true,
            },
            typeHints: {
              enable: true,
            },
          },
          lens: {
            enable: true,
            run: {
              enable: true,
            },
            debug: {
              enable: true,
            },
          },
        };
      default:
        return {};
    }
  }

  private async _getDocumentSymbols(
    model: monaco.editor.ITextModel,
    lineNumber: number
  ) {
    if (model.isDisposed()) {
      return null;
    }

    const ext = model.uri.path.split(".").pop() || "";
    const port = getLanguageServer(ext);
    if (!port || !this._clients.has(port)) return null;
    const client = this._clients.get(port)!;

    try {
      const symbols = (await client.sendRequest("textDocument/documentSymbol", {
        textDocument: { uri: model.uri.toString() },
      })) as any[];

      return symbols?.length ? this._findSymbol(symbols, lineNumber) : null;
    } catch (error) {
      return null;
    }
  }

  private async _getDocumentStructure(
    model: monaco.editor.ITextModel
  ): Promise<any[] | null> {
    if (model.isDisposed()) {
      return null;
    }

    const ext = model.uri.path.split(".").pop() || "";
    const port = getLanguageServer(ext);
    if (!port || !this._clients.has(port)) return null;
    const client = this._clients.get(port)!;

    try {
      const symbols = (await client.sendRequest("textDocument/documentSymbol", {
        textDocument: { uri: model.uri.toString() },
      })) as any[];

      return symbols.length ? symbols : null;
    } catch (error) {
      return null;
    }
  }

  private _findSymbol(symbols: any[], lineNumber: number): any | null {
    for (const symbol of symbols) {
      const range = symbol.range || symbol.location?.range;
      if (!range) continue;

      const startLine =
        (range.start?.line ?? range.startLineNumber) +
        (typeof range.start?.line === "number" ? 1 : 0);
      const endLine =
        (range.end?.line ?? range.endLineNumber) +
        (typeof range.end?.line === "number" ? 1 : 0);

      if (lineNumber >= startLine && lineNumber <= endLine) {
        return symbol.children?.length
          ? this._findSymbol(symbol.children, lineNumber) || symbol
          : symbol;
      }
    }
    return null;
  }

  async _open(tab: IEditorTab) {
    this._ensure();
    this._visiblity(true);

    const key = this._normalizePath(tab.uri);
    let model = this._models.get(key);

    if (!model || model.isDisposed()) {
      if (model && model.isDisposed()) {
        this._models.delete(key);
        model = undefined;
      }

      const uri = monaco.Uri.file(tab.uri);
      const extension = path.extname(tab.uri).substring(1);
      const monacoLanguageId = this._getMonacoLanguageId(extension);

      const existingModel = monaco.editor.getModel(uri);
      if (existingModel && !existingModel.isDisposed()) {
        model = existingModel;
      } else {
        model = monaco.editor.createModel(
          await fs.readFile(tab.uri),
          monacoLanguageId,
          uri
        );
      }

      this._models.set(key, model);
      if (!this._tabs.find((t) => this._normalizePath(t.uri) === key))
        this._tabs.push(tab);

      model.onDidChangeContent(() => {
        if (!this._updating) this._update(tab.uri, true);
      });

      this._watch(tab.uri);

      setTimeout(async () => {
        await this._setupClientForLanguage(extension);
      }, 1000);
    }

    if (!model.isDisposed()) {
      this._editor.setModel(model);
      this._editor.focus();
    } else {
    }
  }

  private _watch(uriString: string) {
    const key = this._normalizePath(uriString);
    if (this._watchers.has(key)) return;

    try {
      const uri = monaco.Uri.file(uriString);
      const watcher = fs.watchFile(
        uri.fsPath,
        { persistent: true, interval: 1000 },
        () => this._external(uriString)
      );
      this._watchers.set(key, watcher);
    } catch {}
  }

  private async _external(uriString: string) {
    const key = this._normalizePath(uriString);
    const model = this._models.get(key);
    if (!model || model.isDisposed()) return;

    try {
      const newContent = await fs.readFile(uriString);
      const currentContent = model.getValue();
      if (currentContent === newContent) return;
      this._updating = true;
      const fullRange = model.getFullModelRange();
      const editOperation = {
        range: fullRange,
        text: newContent,
        forceMoveMarkers: true,
      };
      model.pushEditOperations([], [editOperation], () => {
        return null;
      });
      this._updating = false;
      this._update(uriString, false);
    } catch (error) {}
  }

  private _update(uriString: string, _touched: boolean) {
    this._tabs = this._tabs.map((tab) =>
      this._normalizePath(tab.uri) === this._normalizePath(uriString)
        ? { ...tab, is_touched: _touched }
        : tab
    );

    const _updated = select((s) => s.main.editor_tabs).map((tab) =>
      this._normalizePath(tab.uri) === this._normalizePath(uriString)
        ? { ...tab, is_touched: _touched }
        : tab
    );

    dispatch(update_editor_tabs(_updated));
  }

  async _save(uriString: string) {
    const key = this._normalizePath(uriString);
    const model = this._models.get(key);
    if (!model || model.isDisposed()) {
      return;
    }

    try {
      fs.createFile(uriString, model.getValue());
      if (uriString.endsWith(".py"))
        await python.executeScript(
          path.join([path.__dirname, "scripts", "format.py"]),
          [uriString]
        );

      this._update(uriString, false);
    } catch {}
  }

  public _close(uriString: string) {
    const key = this._normalizePath(uriString);
    const model = this._models.get(key);
    if (!model) return;

    const watcher = this._watchers.get(key);
    if (watcher) {
      try {
        fs.unwatchFile(uriString);
      } catch {}
      this._watchers.delete(key);
    }

    if (!model.isDisposed()) {
      model.dispose();
    }

    this._models.delete(key);

    this._tabs = this._tabs.filter(
      (tab) => this._normalizePath(tab.uri) !== key
    );

    if (this._editor && this._editor.getModel() === model) {
      if (this._tabs.length > 0) {
        this._open(this._tabs[this._tabs.length - 1]!);
      } else {
        this._editor.setModel(null);
        this._visiblity(false);
        this._saveActionDisposable?.dispose();
        this._saveActionDisposable = undefined as any;
      }
    }

    if (this._editor && this._tabs.length > 0) {
      this._editor.focus();
    }
  }

  dispose() {
    this._registeredProviders.forEach((disposable) => {
      try {
        disposable.dispose();
      } catch (error) {}
    });
    this._registeredProviders.clear();
    this._isProvidersRegistered = false;

    this._models.forEach((model) => {
      if (!model.isDisposed()) {
        model.dispose();
      }
    });
    this._models.clear();

    this._watchers.forEach((_, uri) => {
      try {
        fs.unwatchFile(uri);
      } catch {}
    });
    this._watchers.clear();

    this._saveActionDisposable?.dispose();

    this._clients.forEach((client) => {
      try {
        client.stop();
      } catch {}
    });
    this._clients.clear();

    if (this._editor) {
      try {
        this._editor.dispose();
      } catch {}
    }

    this._tabs = [];
    this._mounted = false;
  }
}

const _editor = new Editor();
registerStandalone("editor", _editor);
