import { IEditorTab } from "../../../workbench/workbench.types.js";
import { _contextEvent } from "../common/context.js";

export const api = {
  window: {
    activeTextEditor: {
      get document() {
        return _contextEvent.send(
          "workbench.editor.get.active.file"
        ) as any as IEditorTab;
      },
      save: () => {
        _contextEvent.send("workbench.editor.save.active.file");
      },
    },

    showTextDocument: (_file: IEditorTab) => {
      _contextEvent.send("workbench.editor.open.file", _file);
    },

    showUntitledDocument: () => {
      _contextEvent.send("workbench.editor.open.temporary.file");
    },
  },

  workspace: {
    openTextDocument: (_file: IEditorTab) => {
      _contextEvent.send("workbench.editor.open.file", _file);
    },
  },

  editor: {
    getActiveEditor: () => {
      return _contextEvent.send("workbench.editor.get.editor");
    },

    getModel: () => {
      return _contextEvent.send("workbench.editor.get.model");
    },
  },
};
