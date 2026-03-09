import editor_worker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import json_worker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import css_worker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import html_worker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import typescript_worker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

(self as any).MonacoEnvironment = {
  getWorker(_: unknown, label: string) {
    if (label === "json") return new json_worker();
    if (label === "css" || label === "scss" || label === "less")
      return new css_worker();
    if (label === "html" || label === "handlebars" || label === "razor")
      return new html_worker();
    if (label === "typescript" || label === "javascript")
      return new typescript_worker();
    return new editor_worker();
  },
};

import "../editor.monaco.theme";
import "../editor.monaco.customize";
import { h } from "../../workbench/contrib/core/dom/h";
import { Button } from "../../workbench/browser/parts/components/button";
import { editor } from "../editor";
import {
  IMonacoEditor,
  IMonacoModel,
  tab_status,
} from "../../../types/editor.types";
import {
  monaco,
  path_to_language,
  update_editor_tab,
  update_editor_tab_status,
} from "../editor.helper";
import { patch_peek_model_service } from "../editor.monaco.customize";
import { lsp_client } from "../editor.monaco.lsp";
import { store } from "../../workbench/common/state/store";
import { update_tabs } from "../../workbench/common/state/slices/editor.slice";
import { get_base_name } from "../../platform/explorer/explorer.helper";
import { explorer } from "../../platform/explorer/explorer.service";
import { shortcuts } from "../../workbench/common/shortcut/shortcut.service";
import { editor_events } from "../../platform/events/editor.events";
import { statusbar_events } from "../../platform/events/statusbar.events";

type Disposer = () => void;

const root_el = h("div", {
  class:
    "monaco-editor relative min-h-0 h-full w-full overflow-hidden [&_span]:font-normal [&_a]:text-link-foreground [&_a]:hover:underline",
});

const EDITOR_DEF: IMonacoEditor = {
  el: root_el,
  parent_el: null as any,
  instance: null as any,
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
  dispose() {
    EDITOR_DEF.instance?.dispose();
  },
};

function get_tab_size(instance: monaco.editor.IStandaloneCodeEditor): number {
  return instance.getModel()?.getOptions()?.tabSize ?? 2;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export class monaco_editor extends editor<IMonacoEditor, IMonacoModel> {
  private get instance() {
    return (this.editor as IMonacoEditor).instance;
  }

  private get parent_el() {
    return (this.editor as IMonacoEditor).parent_el;
  }

  private error_el: HTMLElement | null = null;
  private model_disposers = new Map<string, Disposer[]>();

  constructor() {
    super(EDITOR_DEF);
  }

  public set_visible(visible = true): void {
    this.parent_el
      .querySelector(".monaco-editor")
      ?.classList.toggle("hidden", !visible);
    this.error_el?.classList.toggle("hidden", !visible);
  }

  public async mount(parent?: HTMLElement): Promise<void> {
    if (!parent) return;

    (this.editor as IMonacoEditor).parent_el = parent;
    parent.appendChild(root_el);

    (this.editor as IMonacoEditor).instance = monaco.editor.create(root_el, {
      language: "plaintext",
      theme: "theme",
      fontFamily: "JetBrains Mono, monospace",
      selectionHighlight: true,
      renderLineHighlight: "all",
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 15,
      folding: true,
      cursorSmoothCaretAnimation: "on",
      cursorBlinking: "expand",
      fixedOverflowWidgets: true,
      largeFileOptimizations: true,
      quickSuggestions: true,
      suggestOnTriggerCharacters: true,
      parameterHints: { enabled: true },
      codeLens: true,
      codeLensFontFamily: "JetBrains Mono",
      fontLigatures: true,
      bracketPairColorization: { enabled: true },
      wordBasedSuggestions: "off",
    });

    patch_peek_model_service();

    this.setup_editor_events();
    this.setup_statusbar_events();
    await this.setup_lsp();

    this.instance.addCommand(monaco.KeyCode.F1, () => {});

    shortcuts.register_command({
      id: "editor.save",
      run: () => this.save_file(),
    });
    shortcuts.register_command({
      id: "editor.saveAs",
      run: () => this.save_file_as(),
    });
  }

  private setup_editor_events(): void {
    editor_events.on("focus", () => this.instance.focus());
    editor_events.on("setLanguage", (lang: string) => {
      const editor = monaco.editor.getEditors?.()[0];
      const model = editor?.getModel();
      if (!model) return;

      monaco.editor.setModelLanguage(model, lang);

      const updated_lang = monaco.languages
        .getLanguages()
        .find((l) => l.id === model.getLanguageId());

      statusbar_events.emit(
        "updateLanguage",
        updated_lang?.aliases?.[0] ?? capitalize(model.getLanguageId()),
      );
    });
    editor_events.on("setIndentation", (spaces: number) => {
      const editor = monaco.editor.getEditors?.()[0];
      const model = editor?.getModel();
      if (!model) return;

      model.updateOptions({ tabSize: spaces });

      statusbar_events.emit("updateIndentation", spaces);
    });
    editor_events.on("setEncoding", (_: string) => {});
  }

  private setup_statusbar_events(): void {
    this.instance.onDidChangeCursorPosition((e) => {
      statusbar_events.emit(
        "updateLineCol",
        e.position.lineNumber,
        e.position.column,
      );
    });

    this.instance.onDidChangeModel(() => {
      const model = this.instance.getModel();
      if (!model) {
        statusbar_events.emit("updateLineCol", null, null);
        statusbar_events.emit("updateLanguage", null);
        statusbar_events.emit("updateEncoding", null);
        statusbar_events.emit("updateIndentation", null);
        return;
      }
      const pos = this.instance.getPosition();
      statusbar_events.emit(
        "updateLineCol",
        pos?.lineNumber ?? 1,
        pos?.column ?? 1,
      );
      const lang = monaco.languages
        .getLanguages()
        .find((l) => l.id === model.getLanguageId());

      statusbar_events.emit(
        "updateLanguage",
        lang?.aliases?.[0] ?? capitalize(model.getLanguageId()),
      );
      statusbar_events.emit("updateEncoding", "UTF-8");
      statusbar_events.emit("updateIndentation", get_tab_size(this.instance));
    });

    this.instance.onDidChangeConfiguration(() => {
      if (!this.instance.getModel()) return;
      statusbar_events.emit("updateIndentation", get_tab_size(this.instance));
    });
  }

  private async setup_lsp(): Promise<void> {
    lsp_client.register({
      languageId: "python",
      extensions: ["py"],
    });
    await lsp_client.start();
  }

  private async save_file(): Promise<void> {
    const m = this.active_model;
    if (!m) return;
    const tabs = store.getState().editor.tabs;
    const tab = tabs.find((t) => t.file_path === m.uri);
    if (!tab) return;

    if (tab.tab_status === "NEW") return this.save_file_as();

    const res = await explorer.actions.create_file(m.uri, m.model.getValue());
    store.dispatch(
      update_tabs(
        tabs.map((t) =>
          t.file_path === m.uri ? { ...t, is_touched: !res } : t,
        ),
      ),
    );
  }

  private async save_file_as(): Promise<void> {
    const m = this.active_model;
    if (!m) return;
    const tabs = store.getState().editor.tabs;
    if (!tabs.find((t) => t.file_path === m.uri)) return;

    const res = await window.files.saveAs(m.model.getValue(), m.uri);
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
  }

  public async create_model(file_path: string): Promise<IMonacoModel> {
    const uri = monaco.Uri.file(file_path);
    const content = (await window.files.exists(file_path))
      ? await explorer.actions.read_file(file_path)
      : "";

    const existing = monaco.editor.getModel(uri);
    const model =
      existing ??
      monaco.editor.createModel(content, path_to_language(file_path), uri);
    if (existing && existing.getValue() !== content) existing.setValue(content);

    return {
      uri: file_path,
      model,
      dispose: () => model.dispose(),
      cursor_position: { line: 1, col: 1 },
      selection: { startLine: 1, startCol: 1, endLine: 1, endCol: 1 },
    };
  }

  public add_model(model: IMonacoModel): void {
    this.models.push(model);
    this.bind_model_tracking(model);
  }

  public update_model_uri(old_path: string, new_path: string): void {
    const model = this.models.find((m) => m.uri === old_path) as
      | IMonacoModel
      | undefined;
    if (!model) return;

    this.model_disposers.get(old_path)?.forEach((d) => d());
    this.model_disposers.delete(old_path);

    const new_model = monaco.editor.createModel(
      model.model.getValue(),
      path_to_language(new_path),
      monaco.Uri.file(new_path),
    );

    const { cursor_position, selection } = model;
    model.model.dispose();
    Object.assign(model, {
      uri: new_path,
      model: new_model,
      cursor_position,
      selection,
    });

    this.bind_model_tracking(model);

    if (
      this.active_model?.uri === old_path ||
      this.active_model?.uri === new_path
    ) {
      this.active_model = model;
      this.instance.setModel(new_model);
      if (selection) {
        const s = selection;
        this.instance.setSelection(
          new monaco.Selection(s.startLine, s.startCol, s.endLine, s.endCol),
        );
      }
    }

    update_editor_tab(old_path, new_path);
  }

  private bind_model_tracking(m: IMonacoModel): void {
    if (!this.instance) return;

    const save_cursor = () => {
      if (this.instance.getModel() !== m.model) return;
      const sel = this.instance.getSelection();
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
        const pos = this.instance.getPosition();
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

    const d1 = this.instance.onDidChangeCursorSelection(save_cursor);
    const d2 = m.model.onDidChangeContent(mark_touched);
    this.model_disposers.set(m.uri, [() => d1.dispose(), () => d2.dispose()]);
  }

  public async set_model_active(
    uri: string,
    status?: tab_status,
  ): Promise<void> {
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

    const stat = exists
      ? await window.files.stat(uri)
      : status === "NEW"
        ? { isFile: true }
        : { isFile: false };

    if (!stat.isFile) {
      this.show_error("Cannot open folders in the editor.");
      return;
    }

    this.hide_error();
    this.active_model = model;
    this.instance.setModel(model.model);

    if (model.selection) {
      const s = model.selection;
      this.instance.setSelection(
        new monaco.Selection(s.startLine, s.startCol, s.endLine, s.endCol),
      );
      this.instance.revealRangeInCenter(
        new monaco.Range(s.startLine, s.startCol, s.endLine, s.endCol),
      );
    } else {
      const pos = model.cursor_position ?? { line: 1, col: 1 };
      this.instance.setPosition({ lineNumber: pos.line, column: pos.col });
      this.instance.revealPositionInCenter({
        lineNumber: pos.line,
        column: pos.col,
      });
    }

    this.instance.focus();
  }

  public update_editor(): void {
    if (!this.active_model) return;
    const model = this.active_model as IMonacoModel;
    if (this.instance.getModel() !== model.model)
      this.instance.setModel(model.model);
  }

  private show_error(
    msg: string,
    action?: string,
    actionClick?: () => void,
  ): void {
    this.set_visible(false);
    this.error_el = h(
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
    if (!this.error_el.parentElement) this.parent_el.appendChild(this.error_el);
    this.error_el.classList.remove("hidden");
  }

  private hide_error(): void {
    this.error_el?.classList.add("hidden");
    this.set_visible(true);
  }

  public dispose_model(uri: string): void {
    const index = this.models.findIndex((m) => m.uri === uri);
    if (index === -1) return;
    const model = this.models[index] as IMonacoModel;
    this.model_disposers.get(uri)?.forEach((d) => d());
    this.model_disposers.delete(uri);
    model.dispose();
    this.models.splice(index, 1);
  }

  public dispose(): void {
    this.model_disposers.forEach((disposers) => disposers.forEach((d) => d()));
    this.model_disposers.clear();
    this.instance?.dispose();
  }
}
