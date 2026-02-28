import editor_worker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import json_worker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import css_worker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import html_worker from "monaco-editor/esm/vs/language/html/html.worker?worker";

(self as any).MonacoEnvironment = {
  getWorker(_: unknown, label: string) {
    if (label === "json") return new json_worker();
    if (label === "css" || label === "scss" || label === "less")
      return new css_worker();
    if (label === "html" || label === "handlebars" || label === "razor")
      return new html_worker();

    if (label === "typescript" || label === "javascript") {
      return new Worker(
        URL.createObjectURL(new Blob([""], { type: "application/javascript" })),
      );
    }
    return new editor_worker();
  },
};

import "../editor.monaco.theme";
import "../editor.monaco.customize";
import { Button, h } from "../../../ui";
import { editor } from "../editor";
import { IMonacoEditor, IMonacoModel, tab_status } from "../editor.types";
import {
  monaco,
  path_to_language,
  update_editor_tab,
  update_editor_tab_status,
} from "../editor.helper";
import { shortcuts } from "../../shortcut/shortcut.service";
import { store } from "../../state/store";
import { update_tabs } from "../../state/slices/editor.slice";
import { get_base_name } from "../../explorer/explorer.helper";
import { explorer } from "../../explorer/explorer.service";
import { lspClientManager } from "../editor.monaco.lsp";

const el = h("div", {
  class:
    "monaco-editor relative min-h-0 h-full w-full overflow-hidden [&_span]:font-normal [&_a]:text-link-foreground [&_a]:hover:underline",
});

const _: IMonacoEditor = {
  el,
  parent_el: null as any,
  extensions: [
    "js",
    "jsx",
    "mjs",
    "cjs",
    "ts",
    "tsx",
    "html",
    "htm",
    "css",
    "scss",
    "sass",
    "less",
    "json",
    "jsonc",
    "md",
    "markdown",
    "py",
    "sh",
    "bash",
    "yaml",
    "yml",
    "toml",
    "xml",
    "sql",
    "graphql",
    "gql",
    "dockerfile",
    "env",
    "ini",
    "conf",
    "c",
    "h",
    "cpp",
    "hpp",
    "cc",
    "hh",
    "cs",
    "java",
    "go",
    "rs",
    "php",
    "rb",
    "swift",
    "kt",
    "kts",
    "vue",
    "svelte",
  ],
  instance: null as any,
  dispose() {
    _.instance?.dispose();
  },
};

type Disposer = () => void;

export class monaco_editor extends editor<IMonacoEditor, IMonacoModel> {
  private get monaco_editor() {
    return this.editor as IMonacoEditor;
  }

  private error_el: HTMLElement | null = null;
  private model_disposers = new Map<string, Disposer[]>();

  constructor() {
    super(_);
  }

  public set_visible(visible?: boolean): void {
    const editor = this.monaco_editor.parent_el.querySelector(".monaco-editor");
    if (!editor) return;
    editor.classList.toggle("hidden", !visible);
    if (this.error_el) this.error_el.classList.toggle("hidden", !visible);
  }

  public async mount(parent?: HTMLElement): Promise<void> {
    if (!parent) return;

    this.monaco_editor.parent_el = parent;
    parent.appendChild(this.monaco_editor.el);

    this.monaco_editor.instance = monaco.editor.create(this.monaco_editor.el, {
      language: "plaintext",
      theme: "theme",
      fontFamily: "JetBrains Mono, monospace",
      selectionHighlight: true,
      renderLineHighlight: "all",
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 15,
      folding: true,
      // find: { addExtraSpaceOnTop: true },
      cursorSmoothCaretAnimation: "on",
      cursorBlinking: "expand",
      // useShadowDOM: false,
      fixedOverflowWidgets: true,
    });

    lspClientManager.register({
      languageId: "typescript",
      extensions: ["ts", "tsx", "mts", "cts"],
    });
    lspClientManager.register({
      languageId: "javascript",
      extensions: ["js", "jsx", "mjs", "cjs"],
    });
    lspClientManager.register({ languageId: "python", extensions: ["py"] });
    lspClientManager.register({ languageId: "rust", extensions: ["rs"] });

    await lspClientManager.start();

    this.monaco_editor.instance.addCommand(monaco.KeyCode.F1, function () {});

    const save_as_file = async () => {
      const m = this.active_model;
      if (!m) return;
      const tabs = store.getState().editor.tabs;
      const idx = tabs.findIndex((t) => t.file_path === m.uri);
      if (idx === -1) return;
      try {
        const res = await window.files.saveAs(m.model.getValue());
        if (res.cancel) return;
        store.dispatch(
          update_tabs(
            tabs.map((tab) =>
              tab.file_path === m.uri
                ? {
                    ...tab,
                    is_touched: false,
                    file_path: res.path,
                    name: get_base_name(res.path),
                    tab_status: "EXISTS" as const,
                  }
                : tab,
            ),
          ),
        );
      } catch {}
    };

    const save_file = async () => {
      const m = this.active_model;
      if (!m) return;
      const tabs = store.getState().editor.tabs;
      const idx = tabs.findIndex((t) => t.file_path === m.uri);
      if (idx === -1) return;
      const t = tabs[idx];
      try {
        if (t.tab_status === "NEW") {
          const res = await window.files.saveAs(m.model.getValue());
          store.dispatch(
            update_tabs(
              res.cancel
                ? tabs.map((tab) =>
                    tab.file_path === m.uri
                      ? { ...tab, is_touched: true }
                      : tab,
                  )
                : tabs.map((tab) =>
                    tab.file_path === m.uri
                      ? {
                          ...tab,
                          is_touched: false,
                          file_path: res.path,
                          name: get_base_name(res.path),
                          tab_status: "EXISTS" as const,
                        }
                      : tab,
                  ),
            ),
          );
        } else {
          const res = await explorer.actions.create_file(
            m.uri,
            m.model.getValue(),
          );
          store.dispatch(
            update_tabs(
              tabs.map((tab) =>
                tab.file_path === m.uri ? { ...tab, is_touched: !res } : tab,
              ),
            ),
          );
        }
      } catch {}
    };

    shortcuts.register_command({ id: "editor.save", run: save_file });
    shortcuts.register_command({ id: "editor.saveAs", run: save_as_file });
  }

  public async create_model(file_path: string) {
    const uri = monaco.Uri.file(file_path);
    const content = (await window.files.exists(file_path))
      ? await explorer.actions.read_file(file_path)
      : "";

    const existing = monaco.editor.getModel(uri);
    const model =
      existing ??
      monaco.editor.createModel(content, path_to_language(file_path), uri);

    if (existing && existing.getValue() !== content) {
      existing.setValue(content);
    }
    const m: IMonacoModel = {
      uri: file_path,
      model,
      dispose() {
        model.dispose();
      },
      cursor_position: { line: 1, col: 1 },
      selection: { startLine: 1, startCol: 1, endLine: 1, endCol: 1 },
    };
    return m;
  }

  public add_model(model: IMonacoModel) {
    this.models.push(model);
    this.bind_model_tracking(model);
  }

  public update_model_uri(old_path: string, new_path: string) {
    const model = this.models.find((m) => m.uri === old_path) as
      | IMonacoModel
      | undefined;
    if (!model) return;

    const new_uri = monaco.Uri.file(new_path);
    const new_model = monaco.editor.createModel(
      model.model.getValue(),
      path_to_language(new_path),
      new_uri,
    );

    const old_cursor = model.cursor_position;
    const old_selection = model.selection;

    const disposers = this.model_disposers.get(old_path);
    if (disposers) {
      for (const d of disposers) d();
      this.model_disposers.delete(old_path);
    }

    model.model.dispose();
    model.uri = new_path;
    model.model = new_model;
    model.cursor_position = old_cursor;
    model.selection = old_selection;

    this.bind_model_tracking(model);

    if (
      this.active_model?.uri === old_path ||
      this.active_model?.uri === new_path
    ) {
      this.active_model = model;
      this.monaco_editor.instance.setModel(new_model);
      if (old_selection) {
        const s = old_selection;
        this.monaco_editor.instance.setSelection(
          new monaco.Selection(s.startLine, s.startCol, s.endLine, s.endCol),
        );
      }
    }

    update_editor_tab(old_path, new_path);
  }

  private bind_model_tracking(m: IMonacoModel) {
    if (!this.monaco_editor.instance) return;
    const editor = this.monaco_editor.instance;

    const save_cursor = () => {
      if (editor.getModel() !== m.model) return;
      const sel = editor.getSelection();
      if (sel) {
        m.selection = {
          startLine: sel.selectionStartLineNumber,
          startCol: sel.selectionStartColumn,
          endLine: sel.positionLineNumber,
          endCol: sel.positionColumn,
        };
        m.cursor_position = {
          line: sel.positionLineNumber,
          col: sel.positionColumn,
        };
      } else {
        const pos = editor.getPosition();
        if (pos) {
          m.cursor_position = { line: pos.lineNumber, col: pos.column };
          m.selection = {
            startLine: pos.lineNumber,
            startCol: pos.column,
            endLine: pos.lineNumber,
            endCol: pos.column,
          };
        }
      }
    };

    const mark_touched = () => {
      const tabs = store.getState().editor.tabs;
      const tab = tabs.find((t) => t.file_path === m.uri);
      if (!tab || tab.is_touched) return;
      store.dispatch(
        update_tabs(
          tabs.map((t) =>
            t.file_path === m.uri ? { ...t, is_touched: true } : t,
          ),
        ),
      );
    };

    const d1 = editor.onDidChangeCursorSelection(save_cursor);
    const d2 = m.model.onDidChangeContent(mark_touched);
    this.model_disposers.set(m.uri, [() => d1.dispose(), () => d2.dispose()]);
  }

  public async set_model_active(uri: string, status?: tab_status) {
    const model = this.models.find((m) => m.uri === uri) as IMonacoModel;
    if (!model) return;

    const exists = await window.files.exists(uri);

    if (status === "DELETED" || (!exists && status !== "NEW")) {
      this.show_error("File not found.", "Create file", async () => {
        await explorer.actions.create_file(uri, "");
        update_editor_tab_status(uri, "EXISTS");
        await this.set_model_active(uri, "EXISTS");
      });
      return;
    }

    let st;
    if (exists) st = await window.files.stat(uri);
    else if (status === "NEW") st = { isFile: true };
    else st = { isFile: false };

    if (!st.isFile) {
      this.show_error("Cannot open folders in the editor.");
      return;
    }

    this.hide_error();
    this.active_model = model;

    const editor = this.monaco_editor.instance;
    editor.setModel(model.model);

    if (model.selection) {
      const s = model.selection;
      editor.setSelection(
        new monaco.Selection(s.startLine, s.startCol, s.endLine, s.endCol),
      );
      editor.revealRangeInCenter(
        new monaco.Range(s.startLine, s.startCol, s.endLine, s.endCol),
      );
    } else {
      const pos = model.cursor_position ?? { line: 1, col: 1 };
      editor.setPosition({ lineNumber: pos.line, column: pos.col });
      editor.revealPositionInCenter({ lineNumber: pos.line, column: pos.col });
    }

    editor.focus();
  }

  public update_editor(): void {
    if (!this.active_model) return;
    const model = this.active_model as IMonacoModel;
    const editor = this.monaco_editor.instance;
    if (editor.getModel() === model.model) return;
    editor.setModel(model.model);
  }

  private show_error(msg: string, action?: string, actionClick?: () => void) {
    this.set_visible(false);
    const wrap = h(
      "div",
      {
        class:
          "h-full w-full flex items-center justify-center select-none px-6",
      },
      h(
        "div",
        { class: "flex flex-col items-center gap-2 text-center max-w-[520px]" },
        h("div", { class: "text-[48px] leading-none opacity-80" }, "✕"),
        h("div", { class: "text-[14px] opacity-80" }, msg),
        action && Button(action, { variant: "default", onClick: actionClick }),
      ),
    );
    this.error_el = wrap;
    if (this.monaco_editor.parent_el && !this.error_el.parentElement) {
      this.monaco_editor.parent_el.appendChild(this.error_el);
    }
    this.error_el.classList.remove("hidden");
  }

  private hide_error() {
    this.error_el?.classList.add("hidden");
    this.set_visible(true);
  }

  public dispose_model(uri: string) {
    const index = this.models.findIndex((m) => m.uri === uri);
    if (index === -1) return;
    const model = this.models[index] as IMonacoModel;
    const disposers = this.model_disposers.get(uri);
    if (disposers) {
      for (const d of disposers) d();
      this.model_disposers.delete(uri);
    }
    model.dispose();
    this.models.splice(index, 1);
  }

  public dispose() {
    for (const disposers of this.model_disposers.values()) {
      for (const d of disposers) d();
    }
    this.model_disposers.clear();
    this.monaco_editor.instance?.dispose();
  }
}
