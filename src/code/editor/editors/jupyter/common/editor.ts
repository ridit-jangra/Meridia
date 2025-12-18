import monaco from "../../../common/utils.js";
import "../../../common/icons.js";
import { getLanguage } from "../../../../workbench/common/utils.js";
import { NotebookLSP } from "./notebookLsp.js";

const path = window.path;

export class CellEditor {
  public _editor!: monaco.editor.IStandaloneCodeEditor;
  private _models = new Map<string, monaco.editor.ITextModel>();
  private _mounted = false;
  private _cellId?: string;
  private _cellIndex?: number;
  private _modelChangeListener?: monaco.IDisposable;

  constructor(private _layout: HTMLDivElement) {}

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
      extraEditorClassName: "cell-editor",
    });

    this._mounted = true;
  }

  async _open(
    _uri: string,
    content: string,
    cellId?: string,
    cellIndex?: number
  ) {
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
      this._cellId = cellId!;
      this._cellIndex = cellIndex!;

      if (cellId !== undefined) {
        (model as any)._cellId = cellId;
        (model as any)._cellIndex = cellIndex;
      }

      if (
        monacoLanguageId === "python" &&
        cellId !== undefined &&
        cellIndex !== undefined
      ) {
        NotebookLSP.registerCell(cellId, content, cellIndex);

        if (this._modelChangeListener) {
          this._modelChangeListener.dispose();
        }

        this._modelChangeListener = model.onDidChangeContent(() => {
          const newContent = model!.getValue();
          NotebookLSP.updateCell(cellId, newContent);
        });
      }

      setTimeout(async () => {
        await NotebookLSP.ensureLSPClient(extension);
      }, 500);
    } else {
      this._cellId = cellId!;
      this._cellIndex = cellIndex!;

      if (cellId !== undefined) {
        (model as any)._cellId = cellId;
        (model as any)._cellIndex = cellIndex;
      }
    }

    if (!model.isDisposed()) {
      this._editor.setModel(model);
      this._editor.focus();
    }

    return model;
  }

  updateCellOrder(cellId: string, newIndex: number) {
    if (this._cellId === cellId) {
      this._cellIndex = newIndex;
      NotebookLSP.updateCellIndex(cellId, newIndex);
    }
  }

  dispose() {
    if (this._modelChangeListener) {
      this._modelChangeListener.dispose();
      this._modelChangeListener = undefined as any;
    }

    if (this._cellId) {
      NotebookLSP.removeCell(this._cellId);
    }

    this._models.forEach((model, key) => {
      delete (model as any)._cellId;
      delete (model as any)._cellIndex;

      if (!model.isDisposed()) {
        model.dispose();
      }
    });
    this._models.clear();

    if (this._editor) {
      try {
        this._editor.dispose();
      } catch (error) {}
    }

    this._mounted = false;
  }
}
