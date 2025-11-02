import * as monaco from "monaco-editor";
import "monaco-languages";
import "../common/icons.js";
import {
  CloseAction,
  createConnection,
  ErrorAction,
  MonacoLanguageClient,
  MonacoServices,
} from "monaco-languageclient";
import { listen } from "@codingame/monaco-jsonrpc";
import { IEditorTab } from "../../workbench/workbench.types.js";
import { registerTheme } from "../common/theme.js";
import { extensionToLanguage, registerFsSuggestion } from "../common/utils.js";
import { getLanguage } from "../../workbench/common/utils.js";
import {
  getLanguageServer,
  languages,
} from "../../platform/editor/languages.js";
import { update_editor_tabs } from "../../workbench/common/store/slice.js";
import { dispatch } from "../../workbench/common/store/store.js";
import { select } from "../../workbench/common/store/selector.js";
import {
  getStandalone,
  registerStandalone,
} from "../../workbench/common/class.js";
import { DevPanelTabs } from "../../workbench/browser/parts/devPanel/tabs.js";
import { getThemeIcon } from "../../workbench/browser/media/icons.js";

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
  private _detailsElement?: HTMLElement;
  private _problemsCountElement?: HTMLElement;

  private _clients = new Map<number, MonacoLanguageClient>();
  private _models = new Map<string, monaco.editor.ITextModel>();
  private _watchers = new Map<string, any>();
  private _updating = false;
  private _actionsDisposable?: monaco.IDisposable;
  private _mounted = false;
  private _registeredProviders = new Map<string, monaco.IDisposable>();
  private _isProvidersRegistered = false;
  private _markerChangeListener?: monaco.IDisposable;

  private _previousMarkers = new Map<string, monaco.editor.IMarker[]>();

  constructor() {
    registerTheme(monaco);

    this._setupMarkerListener();
  }

  async _format(_language: string, _text: string, _uri: string) {
    if (_language === "python") {
      const _raw = await python.executeScript(
        path.join([path.__dirname, "scripts", "format.py"]),
        [`"${_text}"`]
      );
      const _response = JSON.parse(_raw[0]!)["formatted_content"];
      return _response;
    } else if (_language === "rust") {
      return window.ipc.invoke("workbench.editor.format.file.rust", _uri);
    } else {
      return window.ipc.invoke("workbench.editor.format.file", _uri);
    }
  }

  private _normalizePath(p: string) {
    return p.toLowerCase().replace(/\//g, "\\");
  }

  private _setupMarkerListener() {
    this._markerChangeListener = monaco.editor.onDidChangeMarkers((uris) => {
      const model = this._editor.getModel();
      if (!model) return;
      if (uris.some((uri) => uri.toString() === model.uri.toString())) {
        this._updateProblemCount();
      }
      uris.forEach((uri) => {
        this._handleMarkerChanges(uri);
      });
    });
  }

  private _handleMarkerChanges(uri: monaco.Uri) {
    const currentMarkers = monaco.editor.getModelMarkers({ resource: uri });
    const uriString = uri.fsPath || uri.path;
    const previousMarkers = this._previousMarkers.get(uriString) || [];

    const createMarkerKey = (marker: monaco.editor.IMarker) =>
      `${marker.startLineNumber}:${marker.startColumn}-${marker.endLineNumber}:${marker.endColumn}:${marker.message}:${marker.severity}`;

    const currentMarkerKeys = new Set(currentMarkers.map(createMarkerKey));

    const filePath = uriString;
    const extension = path.extname(filePath).substring(1);
    const languageName = getLanguage(extension);
    const serverPort = getLanguageServer(extension);

    currentMarkers.forEach((marker) => {
      const eventType = this._getMarkerEventType(marker.severity);

      if (eventType === "error" || eventType === "warning") {
        this._emitDiagnosticEvent(
          eventType,
          path.basename(filePath),
          filePath,
          marker.startLineNumber,
          marker.startColumn,
          marker.endLineNumber,
          marker.endColumn,
          marker.message,
          languageName,
          marker.code?.toString(),
          marker.source
        );
      }
    });

    previousMarkers.forEach((marker) => {
      const markerKey = createMarkerKey(marker);

      if (!currentMarkerKeys.has(markerKey)) {
        const eventType = this._getMarkerEventType(marker.severity);

        if (eventType === "error" || eventType === "warning") {
          this._emitDiagnosticRemovalEvent(
            eventType,
            path.basename(filePath),
            filePath,
            marker.startLineNumber,
            marker.startColumn,
            marker.endLineNumber,
            marker.endColumn,
            marker.message,
            languageName,
            marker.code?.toString(),
            marker.source
          );
        }
      }
    });

    this._previousMarkers.set(uriString, [...currentMarkers]);
  }

  private _getMarkerEventType(severity: monaco.MarkerSeverity): string {
    switch (severity) {
      case monaco.MarkerSeverity.Error:
        return "error";
      case monaco.MarkerSeverity.Warning:
        return "warning";
      case monaco.MarkerSeverity.Info:
        return "info";
      case monaco.MarkerSeverity.Hint:
        return "hint";
      default:
        return "error";
    }
  }

  private _emitDiagnosticEvent(
    eventType: "error" | "warning",
    fileName: string,
    filePath: string,
    line: number,
    column: number,
    endLine: number,
    endColumn: number,
    message: string,
    languageName: string,
    code?: string,
    source?: string
  ) {
    const eventName =
      eventType === "error"
        ? "workbench.editor.detect.error"
        : "workbench.editor.detect.warning";

    document.dispatchEvent(
      new CustomEvent(eventName, {
        detail: {
          fileName,
          filePath,
          line,
          column,
          endLine,
          endColumn,
          message,
          code,
          source: source,
          severity: eventType,
          languageName,
          timestamp: Date.now(),
        },
      })
    );
  }

  private _emitDiagnosticRemovalEvent(
    eventType: "error" | "warning",
    fileName: string,
    filePath: string,
    line: number,
    column: number,
    endLine: number,
    endColumn: number,
    message: string,
    languageName: string,
    code?: string,
    source?: string
  ) {
    const eventName =
      eventType === "error"
        ? "workbench.editor.remove.error"
        : "workbench.editor.remove.warning";

    document.dispatchEvent(
      new CustomEvent(eventName, {
        detail: {
          fileName,
          filePath,
          line,
          column,
          endLine,
          endColumn,
          message,
          code,
          source: source,
          severity: eventType,
          languageName,
          timestamp: Date.now(),
        },
      })
    );
  }

  private async _openFile(
    _path: string,
    position?: { line: number; column: number }
  ) {
    const _clean = monaco.Uri.parse(_path).path;
    const stateValue = select((s) => s.main.editor_tabs);
    const _uri = path.normalize(_clean);

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
            await this._openFile(resolvedPath);
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
        this._actionsDisposable?.dispose();
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
    });

    const _detail = document.createElement("div");
    _detail.className = "details";

    const _problems = document.createElement("div");
    _problems.className = "problems";

    _problems.onclick = () => {
      const _tabs = getStandalone(
        "workbench.workspace.dev.tab"
      ) as DevPanelTabs;
      if (_tabs) _tabs._set("problem");
    };

    _detail.appendChild(_problems);

    this._layout.appendChild(_detail);

    this._detailsElement = _detail;
    this._problemsCountElement = _problems;

    this._mounted = true;
    this._visiblity(false);

    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      noLib: true,
      allowNonTsExtensions: true,
    });

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

    const _languages = languages.keys();

    _languages.forEach((_lang) => {
      const languageId = extensionToLanguage(_lang);

      if (!languageId) {
        console.warn(`Unknown language for extension: ${_lang}`);
        return;
      }

      monaco.languages.registerDocumentFormattingEditProvider(
        extensionToLanguage(_lang)!,
        {
          provideDocumentFormattingEdits: function (model, options, token) {
            const range = model.getFullModelRange();
            const text = model.getValue();
            const langauge = model.getModeId();
            const path = model.uri.path;

            const formattedText = (this as any)._format(langauge, text, path);
            return [
              {
                range: range,
                text: formattedText,
              },
            ];
          },
        }
      );
    });

    _languages.forEach((_lang) => {
      monaco.languages.registerHoverProvider(extensionToLanguage(_lang)!, {
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
    });

    this._setupMouse();
    this._setupCursorTracking();
    this._actions();
  }

  public _visiblity(visible: boolean) {
    const editorElement = document.querySelector(
      ".monaco-editor"
    ) as HTMLDivElement;
    if (editorElement) {
      editorElement.style.display = visible ? "flex" : "none";
    }
  }

  private _updateProblemCount() {
    const model = this._editor.getModel();
    if (!model) {
      this._setNoProblemsState();
      return;
    }

    const markers = monaco.editor.getModelMarkers({ resource: model.uri });
    const errorCount = markers.filter(
      (m) => m.severity === monaco.MarkerSeverity.Error
    ).length;
    const warningCount = markers.filter(
      (m) => m.severity === monaco.MarkerSeverity.Warning
    ).length;

    const totalProblems = errorCount + warningCount;
    this._problemsCountElement!.textContent = totalProblems.toString();

    if (totalProblems === 0) {
      this._setNoProblemsState();
    } else {
      this._clearNoProblemsState();
    }
  }

  private _setNoProblemsState() {
    if (!this._problemsCountElement) return;

    this._problemsCountElement.classList.add("none");

    let noneDiv = this._detailsElement?.querySelector(".none-div");
    if (!noneDiv) {
      noneDiv = document.createElement("div");
      noneDiv.className = "none-div";
      noneDiv.innerHTML = getThemeIcon("check");
      noneDiv.addEventListener("click", () => {
        const _tabs = getStandalone(
          "workbench.workspace.dev.tab"
        ) as DevPanelTabs;
        if (_tabs) _tabs._set("problem");
      });

      this._detailsElement?.appendChild(noneDiv);
    }
  }

  private _clearNoProblemsState() {
    if (!this._problemsCountElement) return;

    this._problemsCountElement.classList.remove("none");

    const noneDiv = this._detailsElement?.querySelector(".none-div");
    if (noneDiv) {
      this._detailsElement?.removeChild(noneDiv);
    }
  }

  private _actions() {
    this._actionsDisposable?.dispose();
    this._actionsDisposable = this._editor.addAction({
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
    this._editor.addAction({
      id: "workbench.formatDocument",
      label: "Format Document",
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KEY_F,
      ],
      contextMenuGroupId: "navigation",
      contextMenuOrder: 2,
      run: async () => {
        const model = this._editor.getModel();
        if (!model) return;

        const formattedText = await this._format(
          model.getModeId(),
          model.getValue(),
          model.uri.path
        );

        if (formattedText && formattedText !== model.getValue()) {
          const fullRange = model.getFullModelRange();
          model.pushEditOperations(
            [],
            [{ range: fullRange, text: formattedText }],
            () => null
          );
        }
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
          const monacoLanguageId = getLanguage(extension);
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

          connection.onNotification(
            "textDocument/publishDiagnostics",
            (params: any) => {
              const { uri, diagnostics } = params;
              const model = monaco.editor.getModel(monaco.Uri.parse(uri));

              if (model) {
                const markers = diagnostics.map((diagnostic: any) => ({
                  severity: this._convertLSPSeverityToMonaco(
                    diagnostic.severity
                  ),
                  startLineNumber: diagnostic.range.start.line + 1,
                  startColumn: diagnostic.range.start.character + 1,
                  endLineNumber: diagnostic.range.end.line + 1,
                  endColumn: diagnostic.range.end.character + 1,
                  message: diagnostic.message,
                  code: diagnostic.code,
                  source: diagnostic.source,
                }));

                monaco.editor.setModelMarkers(
                  model,
                  `lsp-${extension}`,
                  markers
                );
              }
            }
          );

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

  private _convertLSPSeverityToMonaco(
    lspSeverity: number
  ): monaco.MarkerSeverity {
    switch (lspSeverity) {
      case 1:
        return monaco.MarkerSeverity.Error;
      case 2:
        return monaco.MarkerSeverity.Warning;
      case 3:
        return monaco.MarkerSeverity.Info;
      case 4:
        return monaco.MarkerSeverity.Hint;
      default:
        return monaco.MarkerSeverity.Error;
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
          workspaceFolder: workspaceRoot,
          rootUri: workspaceRoot,
        };

      case "rs":
        return {
          linkedProjects: [path.join([workspaceRoot, "Cargo.toml"])],
          cargo: {
            buildScripts: { enable: true },
            allTargets: true,
            autoreload: true,
          },
          procMacro: {
            enable: true,
            attributes: { enable: true },
          },
          checkOnSave: true,
          check: {
            command: "check",
            allTargets: true,
          },
          completion: {
            autoimport: { enable: true },
            callable: { snippets: "fill_arguments" },
          },
          inlayHints: {
            chainingHints: { enable: true },
            parameterHints: { enable: true },
            typeHints: { enable: true },
          },
          lens: {
            enable: true,
            run: { enable: true },
            debug: { enable: true },
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
    if (model.isDisposed()) return null;

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
      const monacoLanguageId = getLanguage(extension);

      const existingModel = monaco.editor.getModel(uri);
      if (existingModel && !existingModel.isDisposed()) {
        model = existingModel;
      } else {
        model = monaco.editor.createModel(
          fs.readFile(tab.uri),
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
    }

    this._updateProblemCount();
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

      let savedPosition: monaco.Position | null = null;
      let savedSelection: monaco.Selection | null = null;

      if (this._editor && this._editor.getModel() === model) {
        savedPosition = this._editor.getPosition();
        savedSelection = this._editor.getSelection();
      }

      this._updating = true;
      const fullRange = model.getFullModelRange();
      const editOperation = {
        range: fullRange,
        text: newContent,
        forceMoveMarkers: true,
      };

      model.pushEditOperations(
        savedSelection ? [savedSelection] : [],
        [editOperation],
        (inverseEditOperations) => {
          return savedSelection ? [savedSelection] : null;
        }
      );

      if (this._editor && this._editor.getModel() === model && savedPosition) {
        setTimeout(() => {
          if (this._editor && savedPosition) {
            this._editor.setPosition(savedPosition);
            if (savedSelection) {
              this._editor.setSelection(savedSelection);
            }
          }
        }, 0);
      }

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

  private _clearProblemsForFile(uriString: string) {
    const previousMarkers = this._previousMarkers.get(uriString) || [];

    if (previousMarkers.length === 0) return;

    const filePath = uriString;
    const extension = path.extname(filePath).substring(1);
    const languageName = getLanguage(extension);

    previousMarkers.forEach((marker) => {
      const eventType = this._getMarkerEventType(marker.severity);

      if (eventType === "error" || eventType === "warning") {
        this._emitDiagnosticRemovalEvent(
          eventType,
          path.basename(filePath),
          filePath,
          marker.startLineNumber,
          marker.startColumn,
          marker.endLineNumber,
          marker.endColumn,
          marker.message,
          languageName,
          marker.code?.toString(),
          marker.source
        );
      }
    });

    const uri = monaco.Uri.file(uriString);
    const model = monaco.editor.getModel(uri);
    if (model && !model.isDisposed()) {
      monaco.editor.setModelMarkers(model, "", []);
    }
  }

  async _save(uriString: string) {
    const key = uriString.toLowerCase().replace(/\//g, "\\");
    let model = this._models.get(key);
    if (!model || model.isDisposed()) return;

    try {
      fs.createFile(uriString, model.getValue());
      this._update(uriString, false);
    } catch (err) {
      console.error("Save error:", err);
    }
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

    this._clearProblemsForFile(uriString);

    if (!model.isDisposed()) {
      model.dispose();
    }

    this._models.delete(key);

    this._previousMarkers.delete(uriString);

    this._tabs = this._tabs.filter(
      (tab) => this._normalizePath(tab.uri) !== key
    );

    if (this._editor && this._editor.getModel() === model) {
      if (this._tabs.length > 0) {
        this._open(this._tabs[this._tabs.length - 1]!);
      } else {
        this._editor.setModel(null);
        this._visiblity(false);
        this._actionsDisposable?.dispose();
        this._actionsDisposable = undefined as any;
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

    this._actionsDisposable?.dispose();
    this._markerChangeListener?.dispose();

    this._clients.forEach((client) => {
      try {
        client.stop();
      } catch {}
    });
    this._clients.clear();

    this._previousMarkers.clear();

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
