import monaco from "../../../common/utils.js";
import { marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import { baseUrl } from "marked-base-url";
import { CellEditor } from "../common/editor.js";
import { ICell, ISelectedCell } from "../../../../workbench/workbench.types.js";
import { NotebookLSP } from "../common/notebookLsp.js";

export class NotebookCell {
  private _selectedCell?: ISelectedCell;
  private _disposables: monaco.IDisposable[] = [];
  private _contentListener?: monaco.IDisposable;
  private _resizeObserver?: ResizeObserver;
  private _inputResolve?: (value: string) => void;

  constructor(
    private cell: ICell,
    private index: number,
    private filePath: string,
    private onContentChange: (cellId: string, content: string[]) => void,
    private onCellUpdate: () => void,
    private kernelConnection?: any
  ) {}

  async render(
    cellTools: HTMLElement,
    onScroll: () => void
  ): Promise<HTMLDivElement> {
    const cellEl = document.createElement("div");
    cellEl.className = `cell ${this.cell.cell_type}`;
    cellEl.tabIndex = 0;
    cellEl.dataset.cellId = this.cell.id;
    cellEl.dataset.cellIndex = this.index.toString();

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

    (cellEl as any)._notebookCell = this;

    return cellEl;
  }

  async initializeEditor(cellEl: HTMLDivElement): Promise<ISelectedCell> {
    if (this._selectedCell) {
      return this._selectedCell;
    }

    if (this.kernelConnection) {
      NotebookLSP.setKernelConnection(this.kernelConnection);
    }

    const editorEl = cellEl.querySelector(".editor") as HTMLDivElement;
    const previewEl = cellEl.querySelector(".preview-el") as HTMLDivElement;
    const outputEl = cellEl.querySelector(".output") as HTMLDivElement;

    const fusedSource = this.cell.source
      .map((line) => line.replace(/^\s*\n?$/, ""))
      .filter((line) => line.length > 0)
      .join("\n");

    if (this.cell.cell_type === "markdown") {
      await this._renderMarkdown(fusedSource, previewEl, editorEl, cellEl);
    }

    if (
      this.cell.cell_type === "code" &&
      this.cell.outputs &&
      this.cell.outputs.length > 0
    ) {
      this.renderOutputs(this.cell.outputs, outputEl);
      outputEl.style.display = "block";
    }

    const id = Date.now() + Math.random().toString(36).slice(2);
    const ext = this.cell.cell_type === "code" ? "py" : "md";
    const uri = `workspace:///notebook-cell-${id}.${ext}`;

    const editor = new CellEditor(editorEl);
    editor._mount();
    const model = await editor._open(
      uri,
      fusedSource,
      this.cell.id,
      this.index
    );

    this._resizeEditor(editorEl, cellEl, model);

    this._contentListener = model.onDidChangeContent(() => {
      this.onCellUpdate();

      const content = model.getValue();
      const lines = content.split("\n").map((line) => line + "\n");
      this.onContentChange(this.cell.id, lines);

      this._resizeEditor(editorEl, cellEl, model);
      if (editor._editor) editor._editor.focus();
    });

    this._disposables.push(this._contentListener);
    this._setupAutoGrow(editorEl, cellEl, editor._editor);

    this._selectedCell = {
      cell: this.cell,
      editor: editor._editor,
      editorEl,
      cellEl,
      outputEl,
      previewEl,
      index: this.index,
    };

    (cellEl as any)._selectedCell = this._selectedCell;

    return this._selectedCell;
  }

  private async _renderMarkdown(
    source: string,
    previewEl: HTMLDivElement,
    editorEl: HTMLDivElement,
    cellEl: HTMLDivElement
  ) {
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

    const html = await marked.parse(source);
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

  private _resizeEditor(
    editorEl: HTMLDivElement,
    cellEl: HTMLDivElement,
    model: monaco.editor.ITextModel
  ) {
    const lineCount = model.getLineCount();
    const lineHeight = 24;
    const padding = 40;

    const editorHeight = Math.max(
      80,
      Math.min(450, lineCount * lineHeight + padding)
    );

    editorEl.style.height = `${editorHeight}px`;

    if (this._selectedCell?.editor) {
      this._selectedCell.editor.layout();
    }

    const visibleHeight =
      editorEl.style.display !== "none"
        ? editorEl.offsetHeight
        : cellEl.querySelector(".preview-el")!.clientHeight;

    cellEl.style.height = `${visibleHeight}px`;
  }

  private _setupAutoGrow(
    editorEl: HTMLDivElement,
    cellEl: HTMLDivElement,
    editor: monaco.editor.IStandaloneCodeEditor
  ) {
    this._resizeObserver = new ResizeObserver(() => {
      if (editor) {
        editor.layout();
      }
    });
    this._resizeObserver.observe(cellEl);
    this._resizeObserver.observe(editorEl);
  }

  renderOutputs(outputs: any[], outputEl: HTMLDivElement) {
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
        const resultEl = document.createElement("div");
        resultEl.className = "output-result";

        const data = output.data;

        // Handle HTML output (raw rendering)
        if (data["text/html"]) {
          const htmlContainer = document.createElement("div");
          htmlContainer.className = "output-html";
          htmlContainer.innerHTML = data["text/html"];
          resultEl.appendChild(htmlContainer);
        }
        // Handle images
        else if (data["image/png"]) {
          const img = document.createElement("img");
          img.src = `data:image/png;base64,${data["image/png"]}`;
          resultEl.appendChild(img);
        } else if (data["image/jpeg"]) {
          const img = document.createElement("img");
          img.src = `data:image/jpeg;base64,${data["image/jpeg"]}`;
          resultEl.appendChild(img);
        } else if (data["image/svg+xml"]) {
          const svgContainer = document.createElement("div");
          svgContainer.className = "output-svg";
          svgContainer.innerHTML = data["image/svg+xml"];
          resultEl.appendChild(svgContainer);
        }
        // Handle plain text
        else if (data["text/plain"]) {
          const pre = document.createElement("pre");
          pre.textContent = data["text/plain"];
          resultEl.appendChild(pre);
        }
        // Fallback for unknown formats
        else {
          const pre = document.createElement("pre");
          pre.textContent = JSON.stringify(data, null, 2);
          resultEl.appendChild(pre);
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

        // Handle HTML in display_data
        if (data["text/html"]) {
          const htmlContainer = document.createElement("div");
          htmlContainer.className = "output-html";
          htmlContainer.innerHTML = data["text/html"];
          displayEl.appendChild(htmlContainer);
        } else if (data["image/png"]) {
          const img = document.createElement("img");
          img.src = `data:image/png;base64,${data["image/png"]}`;
          displayEl.appendChild(img);
        } else if (data["image/jpeg"]) {
          const img = document.createElement("img");
          img.src = `data:image/jpeg;base64,${data["image/jpeg"]}`;
          displayEl.appendChild(img);
        } else if (data["image/svg+xml"]) {
          const svgContainer = document.createElement("div");
          svgContainer.className = "output-svg";
          svgContainer.innerHTML = data["image/svg+xml"];
          displayEl.appendChild(svgContainer);
        } else if (data["text/plain"]) {
          const pre = document.createElement("pre");
          pre.textContent = data["text/plain"];
          displayEl.appendChild(pre);
        }

        outputEl.appendChild(displayEl);
      }
    }
  }

  async executeMarkdown(): Promise<void> {
    if (!this._selectedCell) return;

    const html = await marked.parse(this._selectedCell.editor.getValue());
    this._selectedCell.previewEl.innerHTML = html;

    this._selectedCell.cellEl.classList.add("executed");
    this._selectedCell.previewEl.style.display = "block";
    this._selectedCell.editorEl.style.display = "none";
  }

  private _handleStdinRequest(
    prompt: string,
    outputEl: HTMLDivElement
  ): Promise<string> {
    return new Promise((resolve) => {
      const inputContainer = document.createElement("div");
      inputContainer.className = "output-input-container";

      const label = document.createElement("span");
      label.className = "output-input-label";
      label.textContent = prompt || "Input: ";

      const input = document.createElement("input");
      input.type = "text";
      input.className = "output-input-field";
      input.placeholder = "Enter value...";

      const submitBtn = document.createElement("button");
      submitBtn.className = "output-input-submit";
      submitBtn.textContent = "Submit";

      const handleSubmit = () => {
        const value = input.value;
        inputContainer.remove();

        // Show the submitted value
        const submittedEl = document.createElement("div");
        submittedEl.className = "output-input-submitted";
        submittedEl.textContent = `${prompt}${value}`;
        outputEl.appendChild(submittedEl);

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
  }

  async executeCode(
    sessionId: string,
    jupyterExecute: (
      sessionId: string,
      code: string,
      onStdin?: (prompt: string) => Promise<string>
    ) => Promise<any>
  ): Promise<void> {
    if (!this._selectedCell) return;

    const code = this._selectedCell.editor.getValue();

    this._selectedCell.outputEl.innerHTML = "";
    this._selectedCell.outputEl.style.display = "none";

    const loadingEl = document.createElement("div");
    loadingEl.className = "output-loading";
    loadingEl.textContent = "Running...";
    this._selectedCell.outputEl.appendChild(loadingEl);
    this._selectedCell.outputEl.style.display = "block";

    if (!this._selectedCell.cellEl.contains(this._selectedCell.outputEl)) {
      this._selectedCell.cellEl.appendChild(this._selectedCell.outputEl);
    }

    const outputEl = this._selectedCell.outputEl;

    try {
      const { output, result, error } = await jupyterExecute(
        sessionId,
        code,
        (prompt: string) => this._handleStdinRequest(prompt, outputEl)
      );

      this._selectedCell.outputEl.innerHTML = "";

      const outputs: any[] = [];

      if (error) {
        const errorEl = document.createElement("pre");
        errorEl.className = "output-error";
        errorEl.textContent = error;
        this._selectedCell.outputEl.appendChild(errorEl);

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
        this._selectedCell.outputEl.appendChild(outputEl);

        outputs.push({
          name: "stdout",
          output_type: "stream",
          text: output.split("\n").map((line: string) => line + "\n"),
        });
      }

      if (result) {
        const resultEl = document.createElement("div");
        resultEl.className = "output-result";

        // Handle HTML output (raw rendering)
        if (result["text/html"]) {
          const htmlContainer = document.createElement("div");
          htmlContainer.className = "output-html";
          htmlContainer.innerHTML = result["text/html"];
          resultEl.appendChild(htmlContainer);
        }
        // Handle images
        else if (result["image/png"]) {
          const img = document.createElement("img");
          img.src = `data:image/png;base64,${result["image/png"]}`;
          resultEl.appendChild(img);
        } else if (result["image/jpeg"]) {
          const img = document.createElement("img");
          img.src = `data:image/jpeg;base64,${result["image/jpeg"]}`;
          resultEl.appendChild(img);
        } else if (result["image/svg+xml"]) {
          const svgContainer = document.createElement("div");
          svgContainer.className = "output-svg";
          svgContainer.innerHTML = result["image/svg+xml"];
          resultEl.appendChild(svgContainer);
        }
        // Handle plain text
        else if (result["text/plain"]) {
          const pre = document.createElement("pre");
          pre.textContent = result["text/plain"];
          resultEl.appendChild(pre);
        }
        // Fallback
        else {
          const pre = document.createElement("pre");
          pre.textContent = JSON.stringify(result, null, 2);
          resultEl.appendChild(pre);
        }

        this._selectedCell.outputEl.appendChild(resultEl);

        outputs.push({
          output_type: "execute_result",
          data: result,
          execution_count: (this.cell.execution_count || 0) + 1,
        });
      }

      this.cell.outputs = outputs;
      this.cell.execution_count = (this.cell.execution_count || 0) + 1;

      if (output || result || error) {
        this._selectedCell.outputEl.style.display = "block";
      } else {
        this._selectedCell.outputEl.style.display = "none";
      }

      this.onCellUpdate();
    } catch (err) {
      this._selectedCell.outputEl.innerHTML = "";
      const errorEl = document.createElement("pre");
      errorEl.className = "output-error";
      errorEl.textContent = `Failed to execute: ${err}`;
      this._selectedCell.outputEl.appendChild(errorEl);
      this._selectedCell.outputEl.style.display = "block";

      this.cell.outputs = [
        {
          output_type: "error",
          ename: "ExecutionError",
          evalue: String(err),
          traceback: [String(err)],
        },
      ];
    }
  }

  getCell(): ICell {
    return this.cell;
  }

  getSelectedCell(): ISelectedCell | undefined {
    return this._selectedCell;
  }

  updateIndex(newIndex: number) {
    this.index = newIndex;
    if (this._selectedCell) {
      this._selectedCell.index = newIndex;
      this._selectedCell.cellEl.dataset.cellIndex = newIndex.toString();

      if (this._selectedCell.editor) {
        const editorInstance = this._selectedCell.editorEl as any;
        if (editorInstance._cellEditor) {
          editorInstance._cellEditor.updateCellOrder(this.cell.id, newIndex);
        }
      }
    }
  }

  updateCellType(newType: "markdown" | "code") {
    this.cell.cell_type = newType;
    if (this._selectedCell) {
      this._selectedCell.cell.cell_type = newType;
      this._selectedCell.cellEl.className = `cell ${newType}`;

      if (this._selectedCell.editor) {
        monaco.editor.setModelLanguage(
          this._selectedCell.editor.getModel()!,
          newType === "markdown" ? "markdown" : "python"
        );

        if (newType === "markdown") {
          this._selectedCell.cellEl.ondblclick = () => {
            this._selectedCell!.cellEl.classList.remove("executed");
            this._selectedCell!.previewEl.style.display = "none";
            this._selectedCell!.editorEl.style.display = "flex";
            this._selectedCell!.editorEl.focus();
          };
        }

        this._resizeEditor(
          this._selectedCell.editorEl,
          this._selectedCell.cellEl,
          this._selectedCell.editor.getModel()!
        );
      }
    }
  }

  dispose() {
    this._disposables.forEach((d) => d.dispose());
    this._disposables = [];

    if (this._selectedCell?.editor) {
      this._selectedCell.editor.dispose();
    }

    if (this._contentListener) {
      this._contentListener.dispose();
      this._contentListener = undefined as any;
    }

    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = undefined as any;
    }

    this._selectedCell = undefined as any;
  }
}
