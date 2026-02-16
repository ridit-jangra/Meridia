import * as monaco from "monaco-editor";
import { h } from "../../../ui";
import { editor } from "../editor";
import { IMonacoEditor, IMonacoModel } from "../editor.types";

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

export class monaco_editor extends editor<IMonacoEditor, IMonacoModel> {
  private get monacoEditor() {
    return this.editor as IMonacoEditor;
  }

  constructor() {
    super(_);
  }

  public mount(parent?: HTMLElement): void {
    if (!parent) return;

    this.monacoEditor.parent_el = parent;
    parent.appendChild(this.monacoEditor.el);

    this.monacoEditor.instance = monaco.editor.create(this.monacoEditor.el, {
      value: "",
      language: "typescript",
      theme: "vs-dark",
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 13,
    });
  }

  public create_model(file_path: string) {
    const uri = monaco.Uri.parse(`file://${file_path}`);
    const model = monaco.editor.createModel("", undefined, uri);

    const m: IMonacoModel = {
      uri: file_path,
      model,
      dispose() {
        model.dispose();
      },
      cursor_position: { line: 1, col: 1 },
    };

    return m;
  }

  public add_model(model: IMonacoModel) {
    this.models.push(model);
  }

  public set_model_active(uri: string) {
    const model = this.models.find((m) => m.uri === uri) as IMonacoModel;
    if (!model) return;

    this.active_model = model;

    this.monacoEditor.instance.setModel(model.model);

    this.monacoEditor.instance.setPosition({
      lineNumber: model.cursor_position.line,
      column: model.cursor_position.col,
    });

    this.monacoEditor.instance.focus();
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
    model.dispose();
    this.models.splice(index, 1);
  }
}
