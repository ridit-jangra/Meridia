import monaco from "../../../common/utils.js";
import { marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import { baseUrl } from "marked-base-url";
import { getThemeIcon } from "../../../../workbench/browser/media/icons.js";
import { CellEditor } from "../common/editor.js";
import { select } from "../../../../workbench/common/store/selector.js";
import { dispatch } from "../../../../workbench/common/store/store.js";
import { update_editor_tabs } from "../../../../workbench/common/store/slice.js";

const fs = window.fs;
const jupyter = window.jupyter;

interface ICell {
  cell_type: "markdown" | "code";
  id: string;
  metadata: Record<string, any>;
  source: string[];
  outputs?: IOutput[];
  execution_count?: number | null;
}

interface IOutput {
  output_type: "stream" | "display_data" | "execute_result" | "error";

  name?: "stdout" | "stderr";
  text?: string | string[];

  data?: {
    "text/plain"?: string | string[];
    "text/html"?: string | string[];
    "text/markdown"?: string | string[];
    "text/latex"?: string | string[];
    "application/json"?: any;
    "application/javascript"?: string | string[];
    "image/png"?: string;
    "image/jpeg"?: string;
    "image/svg+xml"?: string | string[];
    "application/pdf"?: string;
    [mimeType: string]: any;
  };
  metadata?: Record<string, any>;
  execution_count?: number | null;

  ename?: string;
  evalue?: string;
  traceback?: string[];
}

interface INotebook {
  cells: ICell[];
  metadata: {
    kernelspec?: {
      display_name: string;
      language: string;
      name: string;
    };
    language_info?: {
      name: string;
      version?: string;
      mimetype?: string;
      file_extension?: string;
      pygments_lexer?: string;
      codemirror_mode?: {
        name: string;
        version?: number;
      };
      nbconvert_exporter?: string;
    };
    [key: string]: any;
  };
  nbformat: 4;
  nbformat_minor: 4 | 5;
}

interface ISelectedCell {
  cell: ICell;
  editor: monaco.editor.IStandaloneCodeEditor;
  cellEl: HTMLDivElement;
  editorEl: HTMLDivElement;
  outputEl: HTMLDivElement;
  previewEl: HTMLDivElement;
  index: number;
}

export class Book {
  public _root!: HTMLDivElement;
  private _tools!: HTMLDivElement;
  private _tree!: HTMLDivElement;
  private _cellType!: HTMLSelectElement;
  private _selectedCell!: ISelectedCell | undefined;
  private _cells!: ICell[];
  private _cellTypeChanges: Map<string, string> = new Map();
  private _renderedCells: Map<string, ISelectedCell> = new Map();
  private _sessionId: string | null = null;
  private _isKernelReady: boolean = false;

  constructor(private filePath: string) {
    try {
      const notebook = JSON.parse(fs.readFile(filePath));

      if (Array.isArray(notebook.cells)) {
        const normalizedCells = notebook.cells.map((cell: any) => ({
          ...cell,
          id: typeof cell.id === "string" ? cell.id : crypto.randomUUID(),
          cell_type: cell.cell_type === "markdown" ? "markdown" : "code",
          metadata: cell.metadata ?? {},
          source: Array.isArray(cell.source) ? cell.source : [],
          outputs: Array.isArray(cell.outputs) ? cell.outputs : [],
          execution_count:
            typeof cell.execution_count === "number" ? cell.execution_count : 0,
        }));

        const seen = new Map<string, ICell>();
        this._cells = [];

        for (const cell of normalizedCells) {
          if (seen.has(cell.id)) {
            continue;
          }
          seen.set(cell.id, cell);
          this._cells.push(cell);
        }
      } else {
        this._cells = [];
      }
    } catch (e) {
      this._cells = [];
    }
  }

  private _hasCell(cellId: string): boolean {
    return (
      this._cells.some((c) => c.id === cellId) ||
      this._renderedCells.has(cellId)
    );
  }

  async mount() {
    this._root = document.createElement("div");
    this._root.className = "book";

    try {
      console.log("Starting Jupyter kernel...");
      await jupyter.startKernel();

      await new Promise((resolve) => setTimeout(resolve, 3000));

      const { sessionId } = await jupyter.connectToKernel();
      this._sessionId = sessionId;
      this._isKernelReady = true;
      console.log("Kernel ready, session:", sessionId);
    } catch (err) {
      console.error("Failed to start kernel:", err);
    }

    this._tools = document.createElement("div");
    this._tools.className = "tools";

    const saveTool = this._iconButton("save", () => {
      this.save();
      this.scroll();
    });
    const addTool = this._iconButton("add", async () => {
      const cell: ICell = {
        cell_type: "code",
        id: crypto.randomUUID(),
        metadata: {},
        outputs: [],
        source: [],
        execution_count: 0,
      };

      const newCell = await this.addCell(cell);
      if (newCell) {
        this._selectCell(newCell);
      }
      this.scroll();
      this._update(this.filePath, true);
    });
    const cutTool = this._iconButton("cut", () => {
      const freshSelected = this._tree.querySelector(".cell.selected") as any;
      if (freshSelected?._selectedCell) {
        const safeCell = freshSelected._selectedCell as ISelectedCell;
        this.removeCell(safeCell);
      }
      this._update(this.filePath, true);
      this.scroll();
    });
    const copyTool = this._iconButton("copy", () => {});
    const runTool = this._iconButton("run", () => {
      if (this._selectedCell) {
        this.runCell(this._selectedCell);
        this._update(this.filePath, true);
      }
      this.scroll();
    });
    const stopTool = this._iconButton("stop", () => {});
    const runAllTool = this._iconButton("runAll", () => {
      this._renderedCells.forEach((cell) => {
        this.runCell(cell);
      });
      this._update(this.filePath, true);
      this.scroll();
    });

    this._cellType = document.createElement("select");
    this._cellType.appendChild(this._option("code", "Code"));
    this._cellType.appendChild(this._option("markdown", "Markdown"));
    this._cellType.value = "code";

    this._cellType.onchange = async (event) => {
      const newType = (event.target as HTMLSelectElement).value;
      const active = this._selectedCell;

      if (active) {
        const cellIndex = this._cells.findIndex((c) => c.id === active.cell.id);
        if (cellIndex !== -1) {
          this._cells[cellIndex]!.cell_type = newType as "markdown" | "code";
        }

        active.cell.cell_type = newType as "markdown" | "code";

        monaco.editor.setModelLanguage(
          active.editor.getModel()!,
          newType === "markdown" ? "markdown" : "python"
        );

        if (newType === "markdown") {
          active.cellEl.ondblclick = () => {
            active.cellEl.classList.remove("executed");
            active.previewEl.style.display = "none";
            active.editorEl.style.display = "flex";
            active.editorEl.focus();
          };
        }

        active.cellEl.className = `cell ${newType}`;
        this._cellTypeChanges.set(active.cell.id, newType);

        this._resizeEditor(active, active.editor.getModel()!);
      }
      this._update(this.filePath, true);
      this.scroll();
    };

    this._tools.appendChild(saveTool);
    this._tools.appendChild(addTool);
    this._tools.appendChild(cutTool);
    this._tools.appendChild(copyTool);
    this._tools.appendChild(runTool);
    this._tools.appendChild(stopTool);
    this._tools.appendChild(runAllTool);
    this._tools.appendChild(this._cellType);

    this._tree = document.createElement("div");
    this._tree.className = "cell-tree scrollbar-container x-disable";

    this._root.appendChild(this._tools);
    this._root.appendChild(this._tree);

    if (this._cells.length === 0) {
      const firstCell: ICell = {
        cell_type: "code",
        id: crypto.randomUUID(),
        metadata: {},
        outputs: [],
        source: [],
        execution_count: 0,
      };
      await this.addCell(firstCell);
    } else {
      await Promise.all(this._cells.map((cell) => this.addCell(cell)));
    }

    return this._root;
  }

  save() {
    const notebook: INotebook = {
      cells: this._cells.map((cell) => ({
        cell_type: cell.cell_type,
        id: cell.id,
        metadata: cell.metadata || {},
        source: cell.source || [],
        outputs: cell.outputs || [],
        execution_count: cell.execution_count || 0,
      })),
      metadata: {
        kernelspec: {
          display_name: "Python 3 (ipykernel)",
          language: "python",
          name: "python3",
        },
        language_info: {
          codemirror_mode: { name: "ipython", version: 3 },
          file_extension: ".py",
          mimetype: "text/x-python",
          name: "python",
          nbconvert_exporter: "python",
          pygments_lexer: "ipython3",
          version: "3.13.7",
        },
      },
      nbformat: 4,
      nbformat_minor: 5,
    };

    const content = JSON.stringify(notebook, null, 2);
    fs.createFile(this.filePath, content);

    this.scroll();
    this._update(this.filePath, false);
  }

  dispose() {
    if (this._sessionId) {
      jupyter.shutdownSession(this._sessionId).catch(console.error);
      this._sessionId = null;
      this._isKernelReady = false;
    }

    this._renderedCells.forEach((cell) => {
      cell.editor.dispose();
      if ((cell as any).contentListener)
        (cell as any).contentListener.dispose();
      if ((cell as any).resizeObserver)
        (cell as any).resizeObserver.disconnect();
    });
    this._cells = [];
    this._renderedCells.clear();
    this._cellTypeChanges.clear();
    this._root?.remove();
  }

  getElement() {
    return this._root;
  }

  private _getCellIndex(cellId: string): number {
    return this._cells.findIndex((c) => c.id === cellId);
  }

  moveCellUp(cell: ISelectedCell) {
    const index = this._getCellIndex(cell.cell.id);
    if (index > 0) {
      const temp = this._cells[index];
      this._cells[index] = this._cells[index - 1]!;
      this._cells[index - 1] = temp!;

      const cellElements = Array.from(this._tree.querySelectorAll(".cell"));
      const cellElIndex = cellElements.findIndex(
        (el) => (el as any)._selectedCell?.cell.id === cell.cell.id
      );
      if (cellElIndex > 0) {
        this._tree.insertBefore(cell.cellEl, cellElements[cellElIndex - 1]!);
      }

      cell.index = index - 1;
      cell.cellEl.dataset.cellIndex = (index - 1).toString();
      this._update(this.filePath, true);
      this.scroll();
    }
  }

  moveCellDown(cell: ISelectedCell) {
    const index = this._getCellIndex(cell.cell.id);
    if (index < this._cells.length - 1) {
      const temp = this._cells[index];
      this._cells[index] = this._cells[index + 1]!;
      this._cells[index + 1] = temp!;

      const cellElements = Array.from(this._tree.querySelectorAll(".cell"));
      const cellElIndex = cellElements.findIndex(
        (el) => (el as any)._selectedCell?.cell.id === cell.cell.id
      );
      if (cellElIndex < cellElements.length - 1) {
        this._tree.insertBefore(cellElements[cellElIndex + 1]!, cell.cellEl);
      }

      cell.index = index + 1;
      cell.cellEl.dataset.cellIndex = (index + 1).toString();
      this._update(this.filePath, true);
      this.scroll();
    }
  }

  async addCellAbove(target: ISelectedCell) {
    const targetIndex = this._getCellIndex(target.cell.id);
    let newCellId = crypto.randomUUID();

    if (this._hasCell(newCellId)) {
      console.warn("⚠️ Duplicate cell ID detected, generating new ID");
      newCellId = crypto.randomUUID();
    }

    const newCell: ICell = {
      cell_type: "code",
      id: newCellId,
      metadata: {},
      outputs: [],
      source: [],
      execution_count: 0,
    };

    this._cells.splice(targetIndex, 0, newCell);
    await this._renderAllCells(newCellId);
    this._update(this.filePath, true);
    this.scroll();
  }

  async addCellBelow(target: ISelectedCell) {
    const targetIndex = this._getCellIndex(target.cell.id);
    let newCellId = crypto.randomUUID();

    if (this._hasCell(newCellId)) {
      console.warn("⚠️ Duplicate cell ID detected, generating new ID");
      newCellId = crypto.randomUUID();
    }

    const newCell: ICell = {
      cell_type: "code",
      id: newCellId,
      metadata: {},
      outputs: [],
      source: [],
      execution_count: 0,
    };

    this._cells.splice(targetIndex + 1, 0, newCell);
    await this._renderAllCells(newCellId);
    this._update(this.filePath, true);
    this.scroll();
  }

  private async _renderAllCells(selectCellId?: string) {
    const targetSelectId = selectCellId || this._selectedCell?.cell.id;

    this._renderedCells.forEach((cell) => {
      cell.editor.dispose();
      if ((cell as any).contentListener)
        (cell as any).contentListener.dispose();
      if ((cell as any).resizeObserver)
        (cell as any).resizeObserver.disconnect();
    });

    this._tree.innerHTML = "";
    this._renderedCells.clear();

    for (let i = 0; i < this._cells.length; i++) {
      const cell = this._cells[i]!;
      await this._renderSingleCell(cell, i);
    }

    await new Promise((resolve) => requestAnimationFrame(resolve));

    if (targetSelectId && this._renderedCells.has(targetSelectId)) {
      const cellToSelect = this._renderedCells.get(targetSelectId)!;
      this._selectCell(cellToSelect);
      cellToSelect.editor.focus();
    } else if (this._renderedCells.size > 0) {
      const firstCell = Array.from(this._renderedCells.values())[0];
      this._selectCell(firstCell!);
      firstCell!.editor.focus();
    }
  }

  private async _renderSingleCell(
    cell: ICell,
    index: number
  ): Promise<ISelectedCell> {
    if (this._renderedCells.has(cell.id)) {
      console.warn(`🚫 Skipping duplicate cell render: ${cell.id}`);
      throw new Error(`Duplicate cell detected: ${cell.id}`);
    }

    const cellEl = document.createElement("div");
    cellEl.className = `cell ${cell.cell_type}`;
    cellEl.tabIndex = 0;

    const cellTools = document.createElement("div");
    cellTools.className = "cell-tools";

    const moveAboveTool = this._iconButton("moveUp", () => {
      if (this._selectedCell) this.moveCellUp(this._selectedCell);
    });
    const moveBelowTool = this._iconButton("moveDown", () => {
      if (this._selectedCell) this.moveCellDown(this._selectedCell);
    });
    const addCellAboveTool = this._iconButton("mergeCellAbove", () => {
      if (this._selectedCell) this.addCellAbove(this._selectedCell);
    });

    const addCellBelowTool = this._iconButton("mergeCellBelow", () => {
      if (this._selectedCell) this.addCellBelow(this._selectedCell);
    });
    const deleteTool = this._iconButton("delete", () => {
      if (this._selectedCell) this.removeCell(this._selectedCell);
    });

    cellTools.appendChild(moveAboveTool);
    cellTools.appendChild(moveBelowTool);
    cellTools.appendChild(addCellAboveTool);
    cellTools.appendChild(addCellBelowTool);
    cellTools.appendChild(deleteTool);

    cellEl.appendChild(cellTools);

    const previewEl = document.createElement("div");
    previewEl.className = "preview-el";
    cellEl.appendChild(previewEl);

    const editorEl = document.createElement("div");
    editorEl.className = "editor";
    cellEl.appendChild(editorEl);

    const outputEl = document.createElement("div");
    outputEl.className = "output";
    outputEl.style.display = "none";
    cellEl.appendChild(outputEl);

    this._tree.appendChild(cellEl);

    const id = Date.now() + Math.random().toString(36).slice(2);
    const ext = cell.cell_type === "code" ? "py" : "md";
    const uri = `workspace:///notebook-cell-${id}.${ext}`;

    const fusedSource = cell.source
      .map((line) => line.replace(/^\s*\n?$/, ""))
      .filter((line) => line.length > 0)
      .join("\n");

    if (cell.cell_type === "markdown") {
      marked.use(
        markedHighlight({
          langPrefix: "hljs language-",
          highlight(code: string, lang: string) {
            const language = hljs.getLanguage(lang) ? lang : "plaintext";
            return hljs.highlight(code, { language }).value;
          },
        })
      );

      const baseUrlPath = this.filePath.startsWith("/")
        ? `file://${this.filePath}/`
        : `file:///${this.filePath}/`;

      marked.use(baseUrl(baseUrlPath));

      const html = await marked.parse(fusedSource);
      previewEl.innerHTML = html;
      cellEl.classList.add("executed");

      editorEl.style.display = "none";

      cellEl.ondblclick = () => {
        cellEl.classList.remove("executed");
        previewEl.style.display = "none";
        editorEl.style.display = "flex";
        editorEl.focus();
      };
    }

    if (cell.cell_type === "code" && cell.outputs && cell.outputs.length > 0) {
      this._renderOutputs(cell.outputs, outputEl);
      outputEl.style.display = "block";
    }

    const editor = new CellEditor(editorEl);
    editor._mount();
    const model = await editor._open(uri, fusedSource);

    const lineCount = model.getLineCount();
    const lineHeight = 24;
    const padding = 40;
    const correctHeight = Math.max(
      80,
      Math.min(450, lineCount * lineHeight + padding)
    );

    editorEl.style.height = `${correctHeight}px`;
    cellEl.style.height = `${correctHeight}px`;

    model.onDidChangeContent(() => {
      this._update(this.filePath, true);

      const content = model.getValue();
      const lines = content.split("\n").map((line) => line + "\n");

      const cellIndex = this._cells.findIndex((c) => c.id === cell.id);
      if (cellIndex !== -1) {
        this._cells[cellIndex]!.source = lines;
      }

      const selectedCell = this._selectedCell;
      if (selectedCell && selectedCell.cell.id === cell.id) {
        this._resizeEditor(selectedCell, model);
        this.scroll();
        editor._editor.focus();
      }
    });

    const selectedCell: ISelectedCell = {
      cell: cell,
      editor: editor._editor,
      editorEl,
      cellEl,
      outputEl,
      previewEl,
      index: index,
    };

    this._cellTypeChanges.set(cell.id, cell.cell_type);

    cellEl.dataset.cellIndex = index.toString();
    cellEl.dataset.cellId = cell.id;
    (cellEl as any)._selectedCell = selectedCell;

    this._setupCellSelection(cellEl, selectedCell);
    this._setupAutoGrow(selectedCell, model);
    this._renderedCells.set(cell.id, selectedCell);

    return selectedCell;
  }

  private _renderOutputs(outputs: any[], outputEl: HTMLDivElement) {
    outputEl.innerHTML = "";

    for (const output of outputs) {
      if (output.output_type === "stream") {
        const streamEl = document.createElement("pre");
        streamEl.className = "output-stream";
        const text = Array.isArray(output.text)
          ? output.text.join("")
          : output.text;
        streamEl.textContent = text;
        outputEl.appendChild(streamEl);
      } else if (output.output_type === "execute_result") {
        const resultEl = document.createElement("pre");
        resultEl.className = "output-result";

        const data = output.data;
        if (data["text/plain"]) {
          resultEl.textContent = data["text/plain"];
        } else if (data["text/html"]) {
          resultEl.innerHTML = data["text/html"];
        } else if (data["image/png"]) {
          const img = document.createElement("img");
          img.src = `data:image/png;base64,${data["image/png"]}`;
          resultEl.appendChild(img);
        } else {
          resultEl.textContent = JSON.stringify(data, null, 2);
        }

        outputEl.appendChild(resultEl);
      } else if (output.output_type === "error") {
        const errorEl = document.createElement("pre");
        errorEl.className = "output-error";
        const traceback = Array.isArray(output.traceback)
          ? output.traceback.join("\n")
          : `${output.ename}: ${output.evalue}`;
        errorEl.textContent = traceback;
        outputEl.appendChild(errorEl);
      } else if (output.output_type === "display_data") {
        const displayEl = document.createElement("div");
        displayEl.className = "output-display";

        const data = output.data;
        if (data["image/png"]) {
          const img = document.createElement("img");
          img.src = `data:image/png;base64,${data["image/png"]}`;
          displayEl.appendChild(img);
        } else if (data["text/html"]) {
          displayEl.innerHTML = data["text/html"];
        } else if (data["text/plain"]) {
          const pre = document.createElement("pre");
          pre.textContent = data["text/plain"];
          displayEl.appendChild(pre);
        }

        outputEl.appendChild(displayEl);
      }
    }
  }

  async addCell(cell: ICell) {
    let cellId = cell.id;
    if (!cellId || this._hasCell(cellId)) {
      do {
        cellId = crypto.randomUUID();
      } while (this._hasCell(cellId));
    }

    const safeCell: ICell = { ...cell, id: cellId };

    if (this._hasCell(safeCell.id)) {
      console.error("🚫 Cannot add cell - ID collision after all checks");
      return null;
    }

    const index = this._cells.length;
    this._cells.push(safeCell);

    const created = await this._renderSingleCell(safeCell, index);
    if (created) {
      if (this._cells.length === 1) {
        this._selectedCell = created;
        this._selectCell(created);
      }
      this.scroll();
    }
    return created;
  }

  private scroll() {
    requestAnimationFrame(() => {
      if (this._selectedCell) {
        const treeRect = this._tree.getBoundingClientRect();
        const cellRect = this._selectedCell.cellEl.getBoundingClientRect();

        const cellCenter = cellRect.top + cellRect.height / 2;
        const treeCenter = treeRect.top + treeRect.height / 2;
        const scrollOffset = cellCenter - treeCenter;

        this._tree.scrollTop += scrollOffset;
      }
    });
  }

  private _setupAutoGrow(cell: ISelectedCell, model: monaco.editor.ITextModel) {
    const contentListener = model.onDidChangeContent(() => {
      this._resizeEditor(cell, model);
    });

    const resizeObserver = new ResizeObserver(() => {
      if (cell.editor) {
        cell.editor.layout();
      }
    });
    resizeObserver.observe(cell.cellEl);
    resizeObserver.observe(cell.editorEl);

    this._resizeEditor(cell, model);

    (cell as any).contentListener = contentListener;
    (cell as any).resizeObserver = resizeObserver;
  }

  private _normalizePath(p: string) {
    return p.toLowerCase().replace(/\//g, "\\");
  }

  private _update(uriString: string, _touched: boolean) {
    const _updated = select((s) => s.main.editor_tabs).map((tab) =>
      this._normalizePath(tab.uri) === this._normalizePath(uriString)
        ? { ...tab, is_touched: _touched }
        : tab
    );

    dispatch(update_editor_tabs(_updated));
  }

  async runCell(selectedCell: ISelectedCell) {
    const cell = selectedCell.cell;

    if (cell.cell_type === "markdown") {
      const html = await marked.parse(selectedCell.editor.getValue());
      selectedCell.previewEl.innerHTML = html;

      selectedCell.cellEl.classList.add("executed");

      selectedCell.previewEl.style.display = "block";
      selectedCell.editorEl.style.display = "none";
    } else {
      const code = selectedCell.editor.getValue();

      if (!this._isKernelReady || !this._sessionId) {
        selectedCell.outputEl.innerHTML = "";
        const errorEl = document.createElement("pre");
        errorEl.className = "output-error";
        errorEl.textContent = "Kernel not ready. Please wait...";
        selectedCell.outputEl.appendChild(errorEl);
        selectedCell.outputEl.style.display = "block";
        return;
      }

      selectedCell.outputEl.innerHTML = "";
      selectedCell.outputEl.style.display = "none";

      const loadingEl = document.createElement("div");
      loadingEl.className = "output-loading";
      loadingEl.textContent = "Running...";
      selectedCell.outputEl.appendChild(loadingEl);
      selectedCell.outputEl.style.display = "block";

      if (!selectedCell.cellEl.contains(selectedCell.outputEl)) {
        selectedCell.cellEl.appendChild(selectedCell.outputEl);
      }

      try {
        const { output, result, error } = await jupyter.executeToKernel(
          this._sessionId,
          code
        );

        selectedCell.outputEl.innerHTML = "";

        const outputs: any[] = [];

        if (error) {
          const errorEl = document.createElement("pre");
          errorEl.className = "output-error";
          errorEl.textContent = error;
          selectedCell.outputEl.appendChild(errorEl);

          outputs.push({
            output_type: "error",
            ename: error.split(":")[0]?.trim() || "Error",
            evalue: error.split(":").slice(1).join(":").trim(),
            traceback: [error],
          });
        }

        if (output) {
          const outputEl = document.createElement("pre");
          outputEl.className = "output-stream";
          outputEl.textContent = output;
          selectedCell.outputEl.appendChild(outputEl);

          outputs.push({
            name: "stdout",
            output_type: "stream",
            text: output.split("\n").map((line: string) => line + "\n"),
          });
        }

        if (result) {
          const resultEl = document.createElement("pre");
          resultEl.className = "output-result";

          if (result["text/plain"]) {
            resultEl.textContent = result["text/plain"];
          } else if (result["text/html"]) {
            resultEl.innerHTML = result["text/html"];
          } else if (result["image/png"]) {
            const img = document.createElement("img");
            img.src = `data:image/png;base64,${result["image/png"]}`;
            resultEl.appendChild(img);
          } else {
            resultEl.textContent = JSON.stringify(result, null, 2);
          }

          selectedCell.outputEl.appendChild(resultEl);

          outputs.push({
            output_type: "execute_result",
            data: result,
            execution_count: (cell.execution_count || 0) + 1,
          });
        }

        const cellIndex = this._cells.findIndex((c) => c.id === cell.id);
        if (cellIndex !== -1) {
          this._cells[cellIndex]!.outputs = outputs;
          this._cells[cellIndex]!.execution_count =
            (this._cells[cellIndex]!.execution_count || 0) + 1;
        }

        if (output || result || error) {
          selectedCell.outputEl.style.display = "block";
        } else {
          selectedCell.outputEl.style.display = "none";
        }

        this._update(this.filePath, true);
        this.scroll();
      } catch (err) {
        selectedCell.outputEl.innerHTML = "";
        const errorEl = document.createElement("pre");
        errorEl.className = "output-error";
        errorEl.textContent = `Failed to execute: ${err}`;
        selectedCell.outputEl.appendChild(errorEl);
        selectedCell.outputEl.style.display = "block";

        const cellIndex = this._cells.findIndex((c) => c.id === cell.id);
        if (cellIndex !== -1) {
          this._cells[cellIndex]!.outputs = [
            {
              output_type: "error",
              ename: "ExecutionError",
              evalue: String(err),
              traceback: [String(err)],
            },
          ];
        }
      }
    }
  }

  private _resizeEditor(cell: ISelectedCell, model: monaco.editor.ITextModel) {
    const lineCount = model.getLineCount();
    const lineHeight = 24;
    const padding = 40;

    let editorHeight = Math.max(
      80,
      Math.min(450, lineCount * lineHeight + padding)
    );

    cell.editorEl.style.height = `${editorHeight}px`;

    if (cell.editor) {
      cell.editor.layout();
    }

    const visibleHeight =
      cell.editorEl.style.display !== "none"
        ? cell.editorEl.offsetHeight
        : cell.previewEl.offsetHeight;

    cell.cellEl.style.height = `${visibleHeight}px`;
  }

  async removeCell(sel: ISelectedCell) {
    if (!sel || !sel.cellEl.isConnected) {
      console.warn("🚫 Invalid/stale cell reference");
      return;
    }

    const removedId = sel.cell.id;
    const removedIndex = sel.index;

    sel.editor.dispose();
    if ((sel as any).contentListener) (sel as any).contentListener.dispose();
    if ((sel as any).resizeObserver) (sel as any).resizeObserver.disconnect();
    sel.cellEl.remove();

    this._cellTypeChanges.delete(removedId);
    this._renderedCells.delete(removedId);
    this._cells = this._cells.filter((c) => c.id !== removedId);

    let targetSelectId: string | undefined;
    if (this._cells.length > 0) {
      if (removedIndex < this._cells.length) {
        targetSelectId = this._cells[removedIndex]!.id;
      } else if (removedIndex > 0) {
        targetSelectId = this._cells[removedIndex - 1]!.id;
      } else {
        targetSelectId = this._cells[0]!.id;
      }
    }

    await this._renderAllCells(targetSelectId);

    this._update(this.filePath, true);
    this.scroll();
  }

  private _setupCellSelection(cellEl: HTMLDivElement, cell: ISelectedCell) {
    cellEl.addEventListener("focusin", () => {
      this._selectCell(cell);
    });

    cellEl.addEventListener("click", (e) => {
      if (!(e.target as HTMLElement).closest(".editor")) {
        this._selectCell(cell);
      }
    });
  }

  private _selectCell(cell: ISelectedCell) {
    this._tree.querySelectorAll(".cell").forEach((el) => {
      el.classList.remove("selected");
    });

    this._selectedCell = cell;
    cell.cellEl.classList.add("selected");
    (cell.cellEl as any)._selectedCell = cell;

    const canonicalCellIndex = this._cells.findIndex(
      (c) => c.id === cell.cell.id
    );
    let currentType: "markdown" | "code";

    if (canonicalCellIndex !== -1) {
      currentType = this._cells[canonicalCellIndex]!.cell_type;
    } else {
      currentType = (this._cellTypeChanges.get(cell.cell.id) ||
        cell.cell.cell_type) as "markdown" | "code";
    }

    this._cellType.value = currentType;
    cell.editorEl.focus();
  }

  private _iconButton(iconName: string, onClick: () => void) {
    const el = document.createElement("span");
    el.innerHTML = getThemeIcon(iconName);
    el.onclick = onClick;
    return el;
  }

  private _option(value: string, label: string) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    return opt;
  }
}
