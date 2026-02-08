import { getThemeIcon } from "../../../../workbench/browser/media/icons.js";
import { select } from "../../../../workbench/common/store/selector.js";
import { dispatch } from "../../../../workbench/common/store/store.js";
import { update_editor_tabs } from "../../../../workbench/common/store/slice.js";
import {
  ICell,
  INotebook,
  ISelectedCell,
} from "../../../../workbench/workbench.types.js";
import { NotebookCell } from "./cell.js";
import { Tooltip } from "../../../../workbench/browser/parts/tooltip/tooltip.js";

const fs = window.fs;
const jupyter = window.jupyter;

export class Book {
  public _root!: HTMLDivElement;
  private _tools!: HTMLDivElement;
  private _tree!: HTMLDivElement;
  private _cellType!: HTMLSelectElement;
  private _selectedCell!: ISelectedCell | undefined;
  private _cells!: ICell[];
  private _notebookCells: Map<string, NotebookCell> = new Map();
  private _sessionId: string | null = null;
  private _intersectionObserver?: IntersectionObserver;
  private _pendingCells: Map<string, { cellEl: HTMLDivElement }> = new Map();
  private _stdinHandlers = new Map<
    string,
    (prompt: string) => Promise<string>
  >();

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
      this._notebookCells.has(cellId)
    );
  }

  private _initIntersectionObserver() {
    this._intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const cellId = entry.target.getAttribute("data-cell-id");
            if (cellId && this._pendingCells.has(cellId)) {
              const pending = this._pendingCells.get(cellId)!;
              const notebookCell = this._notebookCells.get(cellId);
              if (notebookCell) {
                this._initializeCellEditor(notebookCell, pending.cellEl);
              }
            }
          }
        });
      },
      {
        root: this._tree,
        rootMargin: "300px",
        threshold: 0.01,
      },
    );
  }

  async mount() {
    this._root = document.createElement("div");
    this._root.className = "book";

    this._initIntersectionObserver();

    this._startKernelAsync();

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
      this._notebookCells.forEach((notebookCell) => {
        const selectedCell = notebookCell.getSelectedCell();
        if (selectedCell) {
          this.runCell(selectedCell);
        }
      });
      this._update(this.filePath, true);
      this.scroll();
    });

    this._cellType = document.createElement("select");
    this._cellType.appendChild(this._option("code", "Code"));
    this._cellType.appendChild(this._option("markdown", "Markdown"));
    this._cellType.value = "code";

    this._cellType.onchange = async (event) => {
      const newType = (event.target as HTMLSelectElement).value as
        | "markdown"
        | "code";
      const active = this._selectedCell;

      if (active) {
        const notebookCell = this._notebookCells.get(active.cell.id);
        if (notebookCell) {
          notebookCell.updateCellType(newType);

          const cellIndex = this._cells.findIndex(
            (c) => c.id === active.cell.id,
          );
          if (cellIndex !== -1) {
            this._cells[cellIndex]!.cell_type = newType;
          }
        }
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
      const fragment = document.createDocumentFragment();
      for (let i = 0; i < this._cells.length; i++) {
        const cellEl = await this._renderSingleCell(this._cells[i]!, i);
        fragment.appendChild(cellEl);
      }
      this._tree.appendChild(fragment);
    }

    return this._root;
  }

  // Add this method to set up stdin listener (call it in mount() or constructor):
  private _setupStdinListener() {
    const ipcRenderer = (window as any).ipcRenderer;
    if (ipcRenderer) {
      ipcRenderer.on(
        "jupyter-stdin-request",
        async (_: any, data: { requestId: string; prompt: string }) => {
          const { requestId, prompt } = data;

          // Find the currently executing cell and show input UI
          const currentCell = this._selectedCell;
          if (currentCell) {
            const notebookCell = this._notebookCells.get(currentCell.cell.id);
            if (notebookCell) {
              const handler = this._stdinHandlers.get(currentCell.cell.id);
              if (handler) {
                const value = await handler(prompt);
                // Send response back to main process
                ipcRenderer.invoke(
                  "workbench.workspace.stdin.response",
                  requestId,
                  value,
                );
              }
            }
          }
        },
      );
    }
  }

  private async _ensureValidSession(): Promise<boolean> {
    if (!this._sessionId) {
      console.log("[Book] No session, connecting...");
      try {
        const { sessionId } = await jupyter.connectToKernel();
        this._sessionId = sessionId;
        console.log("[Book] Connected with session:", sessionId);
        return true;
      } catch (err) {
        console.error("[Book] Failed to connect:", err);
        return false;
      }
    }
    return true;
  }

  private async _startKernelAsync() {
    try {
      console.log("[Book] Starting Jupyter kernel...");
      const ok = await jupyter.startKernel();
      console.log("[Book] startKernel result:", ok);

      // Add a small delay to ensure kernel is ready
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const { sessionId, status } = await jupyter.connectToKernel();
      console.log("[Book] connectToKernel:", sessionId, status);

      this._sessionId = sessionId;
    } catch (err) {
      console.error("[Book] Failed to start/connect kernel:", err);
      this._sessionId = null;

      // Retry once after a delay
      console.log("[Book] Retrying kernel connection in 2 seconds...");
      setTimeout(async () => {
        try {
          const { sessionId, status } = await jupyter.connectToKernel();
          console.log("[Book] Retry successful:", sessionId, status);
          this._sessionId = sessionId;
        } catch (retryErr) {
          console.error("[Book] Retry failed:", retryErr);
        }
      }, 2000);
    }
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
    }

    this._notebookCells.forEach((notebookCell) => {
      notebookCell.dispose();
    });
    this._notebookCells.clear();
    this._stdinHandlers.clear(); // Add this line

    if (this._intersectionObserver) {
      this._intersectionObserver.disconnect();
      this._intersectionObserver = undefined as any;
    }

    this._cells = [];
    this._pendingCells.clear();
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
        (el) => (el as any)._selectedCell?.cell.id === cell.cell.id,
      );
      if (cellElIndex > 0) {
        this._tree.insertBefore(cell.cellEl, cellElements[cellElIndex - 1]!);
      }

      const notebookCell = this._notebookCells.get(cell.cell.id);
      if (notebookCell) {
        notebookCell.updateIndex(index - 1);
      }

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
        (el) => (el as any)._selectedCell?.cell.id === cell.cell.id,
      );
      if (cellElIndex < cellElements.length - 1) {
        this._tree.insertBefore(cellElements[cellElIndex + 1]!, cell.cellEl);
      }

      const notebookCell = this._notebookCells.get(cell.cell.id);
      if (notebookCell) {
        notebookCell.updateIndex(index + 1);
      }

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

    this._notebookCells.forEach((notebookCell) => {
      notebookCell.dispose();
    });

    this._tree.innerHTML = "";
    this._notebookCells.clear();
    this._pendingCells.clear();

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < this._cells.length; i++) {
      const cellEl = await this._renderSingleCell(this._cells[i]!, i);
      fragment.appendChild(cellEl);
    }
    this._tree.appendChild(fragment);

    await new Promise((resolve) => requestAnimationFrame(resolve));

    if (targetSelectId && this._notebookCells.has(targetSelectId)) {
      const notebookCell = this._notebookCells.get(targetSelectId)!;
      const selectedCell = notebookCell.getSelectedCell();
      if (selectedCell) {
        this._selectCell(selectedCell);
        if (selectedCell.editor) selectedCell.editor.focus();
      }
    } else if (this._notebookCells.size > 0) {
      const firstNotebookCell = Array.from(this._notebookCells.values())[0];
      const firstCell = firstNotebookCell!.getSelectedCell();
      if (firstCell) {
        this._selectCell(firstCell);
        if (firstCell.editor) firstCell.editor.focus();
      }
    }
  }

  private async _renderSingleCell(
    cell: ICell,
    index: number,
  ): Promise<HTMLDivElement> {
    const cellTools = this._createCellTools();

    const notebookCell = new NotebookCell(
      cell,
      index,
      this.filePath,
      (cellId: string, content: string[]) => {
        const cellIndex = this._cells.findIndex((c) => c.id === cellId);
        if (cellIndex !== -1) {
          this._cells[cellIndex]!.source = content;
        }
      },
      () => this._update(this.filePath, true),
    );

    this._notebookCells.set(cell.id, notebookCell);

    const cellEl = await notebookCell.render(cellTools, () => this.scroll());

    this._setupCellSelection(cellEl, notebookCell);

    this._pendingCells.set(cell.id, { cellEl });

    if (this._intersectionObserver) {
      this._intersectionObserver.observe(cellEl);
    }

    if (index < 3) {
      await this._initializeCellEditor(notebookCell, cellEl);
    }

    return cellEl;
  }

  private async _initializeCellEditor(
    notebookCell: NotebookCell,
    cellEl: HTMLDivElement,
  ) {
    const selectedCell = await notebookCell.initializeEditor(cellEl);

    this._pendingCells.delete(notebookCell.getCell().id);

    if (this._intersectionObserver) {
      this._intersectionObserver.unobserve(cellEl);
    }

    return selectedCell;
  }

  private _createCellTools(): HTMLDivElement {
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

    return cellTools;
  }

  async addCell(cell: ICell) {
    return new Promise<ISelectedCell | null>((resolve) => {
      requestAnimationFrame(async () => {
        let cellId = cell.id;
        if (!cellId || this._hasCell(cellId)) {
          do {
            cellId = crypto.randomUUID();
          } while (this._hasCell(cellId));
        }

        const safeCell: ICell = { ...cell, id: cellId };

        if (this._hasCell(safeCell.id)) {
          console.error("🚫 Cannot add cell - ID collision after all checks");
          resolve(null);
          return;
        }

        const index = this._cells.length;
        this._cells.push(safeCell);

        const cellEl = await this._renderSingleCell(safeCell, index);
        this._tree.appendChild(cellEl);

        const notebookCell = this._notebookCells.get(safeCell.id);
        if (notebookCell) {
          const created = await this._initializeCellEditor(
            notebookCell,
            cellEl,
          );

          if (this._cells.length === 1) {
            this._selectedCell = created;
            this._selectCell(created);
          }
          this.scroll();
          resolve(created);
        } else {
          resolve(null);
        }
      });
    });
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

  private _normalizePath(p: string) {
    return p.toLowerCase().replace(/\//g, "\\");
  }

  private _update(uriString: string, _touched: boolean) {
    const _updated = select((s) => s.main.editor_tabs).map((tab) =>
      this._normalizePath(tab.uri) === this._normalizePath(uriString)
        ? { ...tab, is_touched: _touched }
        : tab,
    );

    dispatch(update_editor_tabs(_updated));
  }

  async runCell(selectedCell: ISelectedCell) {
    const notebookCell = this._notebookCells.get(selectedCell.cell.id);
    if (!notebookCell) return;

    if (!selectedCell.editor) {
      await this._initializeCellEditor(notebookCell, selectedCell.cellEl);
    }

    const cell = notebookCell.getCell();

    if (cell.cell_type === "markdown") {
      await notebookCell.executeMarkdown();
    } else {
      // Create stdin handler for this cell
      const stdinHandler = (prompt: string) => {
        return new Promise<string>((resolve) => {
          const outputEl = selectedCell.outputEl;

          const inputContainer = document.createElement("div");
          inputContainer.className = "output-input-container";
          inputContainer.style.cssText = `
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          background: var(--vscode-input-background);
          border: 1px solid var(--vscode-input-border);
          border-radius: 4px;
          margin: 4px 0;
        `;

          const label = document.createElement("span");
          label.className = "output-input-label";
          label.textContent = prompt || "Input: ";
          label.style.cssText = `
          color: var(--vscode-input-foreground);
          white-space: nowrap;
        `;

          const input = document.createElement("input");
          input.type = "text";
          input.className = "output-input-field";
          input.placeholder = "Enter value...";
          input.style.cssText = `
          flex: 1;
          padding: 4px 8px;
          background: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          border: 1px solid var(--vscode-input-border);
          border-radius: 2px;
          outline: none;
        `;

          const submitBtn = document.createElement("button");
          submitBtn.className = "output-input-submit";
          submitBtn.textContent = "Submit";
          submitBtn.style.cssText = `
          padding: 4px 12px;
          background: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          border-radius: 2px;
          cursor: pointer;
        `;

          const handleSubmit = () => {
            const value = input.value;
            inputContainer.remove();

            // Show the submitted value
            const submittedEl = document.createElement("div");
            submittedEl.className = "output-input-submitted";
            submittedEl.textContent = `${prompt}${value}`;
            submittedEl.style.cssText = `
            padding: 4px 8px;
            color: var(--vscode-editor-foreground);
            font-family: monospace;
          `;
            outputEl.appendChild(submittedEl);

            this._stdinHandlers.delete(selectedCell.cell.id);
            resolve(value);
          };

          submitBtn.onclick = handleSubmit;
          input.onkeydown = (e) => {
            if (e.key === "Enter") {
              handleSubmit();
            }
          };

          inputContainer.appendChild(label);
          inputContainer.appendChild(input);
          inputContainer.appendChild(submitBtn);
          outputEl.appendChild(inputContainer);

          // Focus the input
          setTimeout(() => input.focus(), 100);
        });
      };

      this._stdinHandlers.set(selectedCell.cell.id, stdinHandler);

      await notebookCell.executeCode(
        this._sessionId!,
        (sessionId: string, code: string) =>
          jupyter.executeToKernel(sessionId, code),
      );
    }

    this._update(this.filePath, true);
    this.scroll();
  }

  async removeCell(sel: ISelectedCell) {
    if (!sel || !sel.cellEl.isConnected) {
      console.warn("🚫 Invalid/stale cell reference");
      return;
    }

    const removedId = sel.cell.id;
    const removedIndex = sel.index;

    const notebookCell = this._notebookCells.get(removedId);
    if (notebookCell) {
      notebookCell.dispose();
    }

    sel.cellEl.remove();

    this._notebookCells.delete(removedId);
    this._pendingCells.delete(removedId);
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

  private _setupCellSelection(
    cellEl: HTMLDivElement,
    notebookCell: NotebookCell,
  ) {
    cellEl.addEventListener("focusin", () => {
      const selectedCell = notebookCell.getSelectedCell();
      if (selectedCell) {
        this._selectCell(selectedCell);
      }
    });

    cellEl.addEventListener("click", (e) => {
      if (!(e.target as HTMLElement).closest(".editor")) {
        const selectedCell = notebookCell.getSelectedCell();
        if (selectedCell) {
          this._selectCell(selectedCell);
        }
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
      (c) => c.id === cell.cell.id,
    );
    let currentType: "markdown" | "code";

    if (canonicalCellIndex !== -1) {
      currentType = this._cells[canonicalCellIndex]!.cell_type;
    } else {
      currentType = cell.cell.cell_type as "markdown" | "code";
    }

    this._cellType.value = currentType;
    cell.editorEl.focus();
  }

  private _iconButton(iconName: string, onClick: () => void) {
    const el = new Tooltip()._getEl(
      document.createElement("span"),
      iconName,
      "top",
    );
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
