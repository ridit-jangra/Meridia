import { editors_registry } from "../../core/registry";

export class editor<
  TEditor extends { extensions: string[]; el: HTMLElement },
  TModel extends { uri: string },
> {
  public models: TModel[] = [];
  public readonly editor: TEditor;
  public active_model: TModel | null = null;

  constructor(editor: TEditor) {
    this.editor = editor;

    editor.extensions.forEach((ext) => {
      editors_registry[ext] = this as any;
    });
  }

  public mount(parent?: HTMLElement) {
    parent;
  }

  public create_model(file_path: string): TModel {
    file_path;
    throw new Error("create_model not implemented");
  }

  public add_model(model: TModel) {
    this.models.push(model);
  }

  public dispose_model(uri: string) {
    const idx = this.models.findIndex((m) => m.uri === uri);
    if (idx === -1) return;

    const model = this.models[idx];
    (model as any).dispose?.();
    this.models.splice(idx, 1);
  }

  public set_model_active(uri: string) {
    const model = this.models.find((m) => m.uri === uri);
    if (!model) return;

    this.active_model = model;
    this.update_editor();
  }

  public get_model(uri: string) {
    return this.models.find((m) => m.uri === uri);
  }

  public update_editor() {}

  public set_visible(visible = true) {
    this.editor.el.style.display = visible ? "flex" : "none";
  }
}
