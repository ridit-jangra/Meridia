import "../editor.monaco.theme";
import { Button, h } from "../../../ui";
import { editor } from "../editor";
import { IMonacoEditor, IMonacoModel } from "../editor.types";
import {
  build_monaco_shortcuts,
  monaco,
  path_to_language,
  update_editor_tab,
} from "../editor.helper";
import { shortcuts } from "../../shortcut/shortcut.service";
import { store } from "../../state/store";
import { update_tabs } from "../../state/slices/editor.slice";
import { get_base_name } from "../../explorer/explorer.helper";
import { explorer } from "../../explorer/explorer.service";

const el = h("div", { class: "monaco-editor h-full w-full" });

const _: IMonacoEditor = {
  el,
  parent_el: null as any,
  extensions: ["ts", "tsx", "js", "jsx", "json", "css", "html", "md", "py"],
  instance: null as any,
  dispose() {
    _.instance?.dispose();
  },
};

type Disposer = () => void;

export class monaco_editor extends editor<IMonacoEditor, IMonacoModel> {
  private get monacoEditor() {
    return this.editor as IMonacoEditor;
  }

  private error_el: HTMLElement | null = null;
  private model_disposers = new Map<string, Disposer[]>();
  private last_touched_at = new Map<string, number>();
  private last_saved_at = new Map<string, number>();

  constructor() {
    super(_);
  }

  public set_visible(visible?: boolean): void {
    const editor = this.monacoEditor.parent_el.querySelector(".monaco-editor");
    if (!editor) return;

    editor.classList.toggle("hidden", !visible);
    if (this.error_el) this.error_el.classList.toggle("hidden", !visible);
  }

  public mount(parent?: HTMLElement): void {
    if (!parent) return;

    this.monacoEditor.parent_el = parent;
    parent.appendChild(this.monacoEditor.el);

    this.monacoEditor.instance = monaco.editor.create(this.monacoEditor.el, {
      value: "",
      language: "plaintext",
      theme: "theme",
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 15,
      folding: true,
      find: {
        addExtraSpaceOnTop: false,
      },
      cursorSmoothCaretAnimation: "on",
      cursorBlinking: "expand",
    });

    this.monacoEditor.instance.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF,
      () => {},
    );

    this.monacoEditor.instance.addCommand(monaco.KeyCode.F1, function () {});

    const monaco_shortcuts = build_monaco_shortcuts(this.monacoEditor.instance);

    for (const s of monaco_shortcuts) {
      const actionId = s.id.replace("editor.", "");

      shortcuts.register_command({
        id: s.command,
        run: () => {
          const action = this.monacoEditor.instance.getAction(actionId);
          action?.run();
        },
      });

      shortcuts.add_shortcut(s);
    }

    const save_as_file = async () => {
      const m = this.active_model;
      if (!m) return;

      const now = Date.now();
      const last = this.last_touched_at.get(m.uri) ?? 0;
      if (now - last < 100) return;
      this.last_touched_at.set(m.uri, now);

      const tabs = store.getState().editor.tabs;
      const idx = tabs.findIndex((t) => t.file_path === m.uri);
      if (idx === -1) return;

      try {
        const res = await window.files.saveAs(m.model.getValue());

        if (res.cancel) return;

        const next = tabs.map((tab) =>
          tab.file_path === m.uri
            ? {
                ...tab,
                is_touched: false,
                file_path: res.path,
                name: get_base_name(res.path),
                tab_status: "EXISTS" as const,
              }
            : tab,
        );

        store.dispatch(update_tabs(next));
      } catch {}
    };

    const save_file = async () => {
      const m = this.active_model;
      if (!m) return;

      const now = Date.now();
      const last = this.last_touched_at.get(m.uri) ?? 0;
      if (now - last < 100) return;
      this.last_touched_at.set(m.uri, now);

      const tabs = store.getState().editor.tabs;
      const idx = tabs.findIndex((t) => t.file_path === m.uri);
      if (idx === -1) return;

      const t = tabs[idx];

      try {
        if (t.tab_status === "NEW") {
          const res = await window.files.saveAs(m.model.getValue());

          let next;

          if (res.cancel) {
            next = tabs.map((tab) =>
              tab.file_path === m.uri ? { ...tab, is_touched: true } : tab,
            );
          } else {
            next = tabs.map((tab) =>
              tab.file_path === m.uri
                ? {
                    ...tab,
                    is_touched: false,
                    file_path: res.path,
                    name: get_base_name(res.path),
                    tab_status: "EXISTS" as const,
                  }
                : tab,
            );
          }

          store.dispatch(update_tabs(next));
        } else {
          const res = await explorer.actions.create_file(
            m.uri,
            m.model.getValue(),
          );
          let next;

          if (!res) {
            next = tabs.map((tab) =>
              tab.file_path === m.uri ? { ...tab, is_touched: true } : tab,
            );
          } else {
            next = tabs.map((tab) =>
              tab.file_path === m.uri ? { ...tab, is_touched: false } : tab,
            );
          }

          store.dispatch(update_tabs(next));
        }
      } catch {}
    };

    monaco.editor.registerLinkOpener({
      open(resource) {
        const url = resource.toString();
        if (url.startsWith("http://") || url.startsWith("https://")) {
          window.shell.open_external(url);
          return true;
        }
        return false;
      },
    });

    shortcuts.register_command({
      id: "editor.save",
      run: async () => {
        await save_file();
      },
    });

    shortcuts.register_command({
      id: "editor.saveAs",
      run: async () => {
        await save_as_file();
      },
    });
  }

  public async create_model(file_path: string) {
    const uri = monaco.Uri.parse(`file://${file_path}`);
    let content: string;

    if (await window.files.exists(file_path))
      content = await explorer.actions.read_file(file_path);
    else content = "";

    const model = monaco.editor.createModel(
      content,
      path_to_language(file_path),
      uri,
    );

    const m: IMonacoModel = {
      uri: file_path,
      model,
      dispose() {
        model.dispose();
      },
      cursor_position: { line: 1, col: 1 },
      selection: {
        startLine: 1,
        startCol: 1,
        endLine: 1,
        endCol: 1,
      },
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

    const new_uri = monaco.Uri.parse(`file://${new_path}`);
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
    this.last_saved_at.delete(old_path);
    this.last_touched_at.delete(old_path);

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
      this.monacoEditor.instance.setModel(new_model);

      if (old_selection) {
        const s = old_selection;
        this.monacoEditor.instance.setSelection(
          new monaco.Selection(s.startLine, s.startCol, s.endLine, s.endCol),
        );
      }
    }

    update_editor_tab(old_path, new_path);
  }

  private bind_model_tracking(m: IMonacoModel) {
    if (!this.monacoEditor.instance) return;

    const editor = this.monacoEditor.instance;

    const mark_touched = () => {
      const now = Date.now();
      const last = this.last_touched_at.get(m.uri) ?? 0;
      if (now - last < 100) return;
      this.last_touched_at.set(m.uri, now);

      const tabs = store.getState().editor.tabs;
      const idx = tabs.findIndex((t) => t.file_path === m.uri);
      if (idx === -1) return;

      const t = tabs[idx];
      if (t.is_touched) return;

      const next = tabs.map((tab) =>
        tab.file_path === m.uri ? { ...tab, is_touched: true } : tab,
      );

      store.dispatch(update_tabs(next));
    };

    const save_state = () => {
      const active = editor.getModel();
      if (!active) return;
      if (active !== m.model) return;

      const now = Date.now();
      const last = this.last_saved_at.get(m.uri) ?? 0;
      if (now - last < 100) return;
      this.last_saved_at.set(m.uri, now);

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

    const d1 = editor.onDidChangeCursorSelection(() => save_state());
    const d2 = m.model.onDidChangeContent(() => {
      save_state();
      mark_touched();
    });

    const disposers: Disposer[] = [() => d1.dispose(), () => d2.dispose()];
    this.model_disposers.set(m.uri, disposers);
  }

  public async set_model_active(uri: string, new_file?: boolean) {
    const model = this.models.find((m) => m.uri === uri) as IMonacoModel;
    if (!model) return;

    const exists = await window.files.exists(uri);
    if (!exists && !new_file) {
      this.show_error("File not found.", "Create file");
      return;
    }

    let st;

    if (await window.files.exists(uri)) st = await window.files.stat(uri);
    else if (new_file)
      st = {
        isFile: true,
      };
    else st = { isFile: false };

    if (!st.isFile) {
      this.show_error("Cannot open folders in the editor.");
      return;
    }

    this.hide_error();

    this.active_model = model;

    const editor = this.monacoEditor.instance;
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
    this.monacoEditor.instance.setModel(model.model);
  }

  private show_error(msg: string, action?: string) {
    this.set_visible(false);

    if (!this.error_el) {
      const wrap = h(
        "div",
        {
          class:
            "h-full w-full flex items-center justify-center select-none px-6",
        },
        h(
          "div",
          {
            class: "flex flex-col items-center gap-2 text-center max-w-[520px]",
          },
          h("div", { class: "text-[48px] leading-none opacity-80" }, "✕"),
          h("div", { class: "text-[14px] opacity-80" }, msg),
          action && Button(action, { variant: "default" }),
        ),
      );

      this.error_el = wrap;
    } else {
      const msgEl = this.error_el.querySelector(
        "div div:last-child",
      ) as HTMLElement | null;
      if (msgEl) msgEl.textContent = msg;
    }

    if (this.monacoEditor.parent_el && !this.error_el.parentElement) {
      this.monacoEditor.parent_el.appendChild(this.error_el);
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
    this.last_saved_at.delete(uri);
    this.last_touched_at.delete(uri);

    model.dispose();
    this.models.splice(index, 1);
  }

  public dispose() {
    for (const [uri, ds] of this.model_disposers) {
      for (const d of ds) d();
      this.last_saved_at.delete(uri);
      this.last_touched_at.delete(uri);
    }
    this.model_disposers.clear();

    this.monacoEditor.instance?.dispose();
  }
}
