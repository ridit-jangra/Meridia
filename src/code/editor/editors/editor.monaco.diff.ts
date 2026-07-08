import { h } from "../../workbench/contrib/core/dom/h";
import { editor } from "../editor";
import { monaco, path_to_language } from "../editor.helper";
import { explorer } from "../../platform/explorer/explorer.service";

interface IDiffEditorDef {
  el: HTMLElement;
  parent_el: HTMLElement;
  instance: monaco.editor.IStandaloneDiffEditor;
  extensions: string[];
  dispose: () => void;
}

interface IDiffModel {
  uri: string;
  original: monaco.editor.ITextModel;
  modified: monaco.editor.ITextModel;
  dispose: () => void;
}

const root_el = h("div", {
  class:
    "monaco-diff-editor relative min-h-0 h-full w-full overflow-hidden [&_span]:font-normal",
});

const DIFF_EDITOR_DEF: IDiffEditorDef = {
  el: root_el,
  parent_el: null as any,
  instance: null as any,
  extensions: [],
  dispose() {
    DIFF_EDITOR_DEF.instance?.dispose();
  },
};

export class diff_editor extends editor<IDiffEditorDef, IDiffModel> {
  private get instance() {
    return (this.editor as IDiffEditorDef).instance;
  }

  constructor() {
    super(DIFF_EDITOR_DEF);
  }

  public mount(parent?: HTMLElement): void {
    if (!parent) return;

    (this.editor as IDiffEditorDef).parent_el = parent;
    parent.appendChild(root_el);

    (this.editor as IDiffEditorDef).instance = monaco.editor.createDiffEditor(
      root_el,
      {
        theme: "theme",
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 15,
        fontLigatures: true,
        automaticLayout: true,
        readOnly: true,
        originalEditable: false,
        renderSideBySide: true,
        ignoreTrimWhitespace: false,
        minimap: { enabled: false },
        smoothScrolling: true,
        contextmenu: false,
      },
    );
  }

  public set_visible(visible = true): void {
    root_el.classList.toggle("hidden", !visible);
  }

  private get_or_create_model(
    scheme: string,
    file_path: string,
    content: string,
    language: string,
  ): monaco.editor.ITextModel {
    const uri = monaco.Uri.from({ scheme, path: file_path });
    const existing = monaco.editor.getModel(uri);
    if (existing) {
      if (existing.getValue() !== content) existing.setValue(content);
      return existing;
    }
    return monaco.editor.createModel(content, language, uri);
  }

  public async create_model(file_path: string): Promise<IDiffModel> {
    const repo = await window.workspace.get_current_workspace_path();

    const modified_content = (await window.files.exists(file_path))
      ? await explorer.actions.read_file(file_path)
      : "";

    const head_content = repo
      ? await window.git.getHeadContent(repo, file_path)
      : "";

    const language = path_to_language(file_path);

    const original = this.get_or_create_model(
      "git-diff-original",
      file_path,
      head_content,
      language,
    );
    const modified = this.get_or_create_model(
      "git-diff-modified",
      file_path,
      modified_content,
      language,
    );

    return {
      uri: file_path,
      original,
      modified,
      dispose: () => {
        original.dispose();
        modified.dispose();
      },
    };
  }

  private ai_models = new Map<
    string,
    { original: monaco.editor.ITextModel; modified: monaco.editor.ITextModel }
  >();

  public show_ai(file_path: string, prev: string, next: string): void {
    const language = path_to_language(file_path);
    let m = this.ai_models.get(file_path);
    if (!m) {
      const original = this.get_or_create_model(
        "ai-diff-original",
        file_path,
        prev,
        language,
      );
      const modified = this.get_or_create_model(
        "ai-diff-modified",
        file_path,
        next,
        language,
      );
      m = { original, modified };
      this.ai_models.set(file_path, m);
    } else {
      if (m.original.getValue() !== prev) m.original.setValue(prev);
      if (m.modified.getValue() !== next) m.modified.setValue(next);
    }
    this.instance.setModel({ original: m.original, modified: m.modified });
    this.set_visible(true);
  }

  public clear_ai(file_path: string): void {
    const m = this.ai_models.get(file_path);
    if (!m) return;
    m.original.dispose();
    m.modified.dispose();
    this.ai_models.delete(file_path);
  }

  public add_model(model: IDiffModel): void {
    this.models.push(model);
  }

  public get_model(uri: string): IDiffModel | undefined {
    return this.models.find((m) => m.uri === uri);
  }

  public async set_model_active(uri: string): Promise<void> {
    const model = this.get_model(uri);
    if (!model) return;

    this.active_model = model;
    this.instance.setModel({
      original: model.original,
      modified: model.modified,
    });
    this.set_visible(true);
    this.instance.focus();
  }

  public update_editor(): void {
    if (!this.active_model) return;
    const m = this.active_model;
    this.instance.setModel({ original: m.original, modified: m.modified });
  }

  public dispose_model(uri: string): void {
    const index = this.models.findIndex((m) => m.uri === uri);
    if (index === -1) return;

    this.models[index].dispose();
    this.models.splice(index, 1);

    if (this.active_model?.uri === uri) {
      this.active_model = null;
      this.instance?.setModel(null);
    }
  }

  public dispose(): void {
    this.models.forEach((m) => m.dispose());
    this.models.length = 0;
    this.instance?.dispose();
  }
}
