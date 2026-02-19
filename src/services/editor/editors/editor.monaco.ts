import "../editor.monaco.theme";
import { ContextMenu, h } from "../../../ui";
import { editor } from "../editor";
import { IMonacoEditor, IMonacoModel } from "../editor.types";
import {
  build_monaco_context_items,
  build_monaco_shortcuts,
  monaco,
  path_to_language,
} from "../editor.helper";
import { shortcuts } from "../../shortcut/shortcut.service";

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

  private model_disposers = new Map<string, Disposer[]>();
  private last_saved_at = new Map<string, number>();
  private ctx = ContextMenu();

  constructor() {
    super(_);
  }

  public set_visible(visible?: boolean): void {
    const editor = this.monacoEditor.parent_el.querySelector(".monaco-editor");
    if (!editor) return;

    editor.classList.toggle("hidden", !visible);
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
      contextmenu: false,
      folding: true,
      find: {
        addExtraSpaceOnTop: false,
      },
    });

    this.monacoEditor.instance.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF,
      () => {},
    );

    this.monacoEditor.instance.addCommand(monaco.KeyCode.F1, function () {});

    this.monacoEditor.instance.onContextMenu((e) => {
      e.event.preventDefault();
      e.event.stopPropagation();

      const ev = e.event.browserEvent as MouseEvent;

      if (e.target.position) {
        this.monacoEditor.instance.setPosition(e.target.position);
        this.monacoEditor.instance.focus();
      }

      const items = build_monaco_context_items(this.monacoEditor.instance);

      if (items.length === 0) return;

      this.ctx.openAt(ev.clientX, ev.clientY, items);
    });

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
  }

  public create_model(file_path: string) {
    const uri = monaco.Uri.parse(`file://${file_path}`);
    const model = monaco.editor.createModel(
      "",
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

  private bind_model_tracking(m: IMonacoModel) {
    if (!this.monacoEditor.instance) return;

    const editor = this.monacoEditor.instance;

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
    const d2 = m.model.onDidChangeContent(() => save_state());

    const disposers: Disposer[] = [() => d1.dispose(), () => d2.dispose()];

    this.model_disposers.set(m.uri, disposers);
  }

  public set_model_active(uri: string) {
    const model = this.models.find((m) => m.uri === uri) as IMonacoModel;
    if (!model) return;

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

    model.dispose();
    this.models.splice(index, 1);
  }

  public dispose() {
    for (const [uri, ds] of this.model_disposers) {
      for (const d of ds) d();
      this.last_saved_at.delete(uri);
    }
    this.model_disposers.clear();

    this.monacoEditor.instance?.dispose();
    this.ctx.destroy();
  }
}
