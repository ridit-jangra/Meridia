import { editors_registry } from "../../core/registry";
import {
  ICustomEditor,
  ICustomModel,
  IMonacoEditor,
  IMonacoModel,
} from "./editor.types";

export class editor {
  public models: ICustomModel[] | IMonacoModel[] = [];
  public readonly editor: ICustomEditor | IMonacoEditor;
  public active_model: ICustomModel | IMonacoModel | null = null;

  constructor(editor: typeof this.editor) {
    this.editor = editor;

    editor.extensions.forEach((ext) => {
      editors_registry[ext] = this;
    });
  }

  public mount(parent?: HTMLElement) {}

  public create_model(file_path: string) {
    const model: ICustomModel | IMonacoModel = {
      uri: file_path,
      dispose() {},
      cursor_position: {
        col: 0,
        line: 0,
      },
    };

    return model;
  }

  public add_model(model: ICustomModel | IMonacoModel) {
    this.models.push(model);
  }

  public dispose_model(uri: string) {
    const model = this.models.find((model) => model.uri === uri);
    if (!model) return;
  }

  public set_model_active(uri: string) {
    const model = this.models.find((model) => model.uri === uri);

    if (!model) return;

    this.active_model = model;

    this.update_editor();
  }

  public get_model(uri: string) {
    const model = this.models.find((model) => model.uri === uri);

    return model;
  }

  public update_editor() {}

  public set_visible(visible = true) {
    this.editor.el.style.display = visible ? "flex" : "none";
  }
}
