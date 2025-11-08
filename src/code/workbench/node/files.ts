import fs from "fs";
import { ipcMain, dialog } from "electron";
import { IFolderStructure } from "../workbench.types.js";
import { Storage } from "./storage.js";
import { walkdir } from "../../base/native/rust/lib/index.cjs";
import { workbench } from "../electron-browser/window.js";
import { _watch } from "./watcher.js";

export async function _get(_path: string, depth: number = 1) {
  const structure = walkdir(_path, depth);

  return structure;
}

ipcMain.handle(
  "workbench.workspace.walkdir",
  async (_, _path: string, depth: number) => {
    return _get(_path, depth);
  }
);

function _update(
  structure: IFolderStructure,
  targetUri: string,
  newStructure: IFolderStructure
): IFolderStructure {
  if (structure.uri === targetUri) {
    return newStructure;
  }

  if (structure.children && structure.children.length > 0) {
    return {
      ...structure,
      children: structure.children.map((child) =>
        _update(child, targetUri, newStructure)
      ),
    };
  }

  return structure;
}

async function _refresh() {
  try {
    const currentStructure = Storage.get(
      "workbench.workspace.folder.structure"
    ) as IFolderStructure;

    if (!currentStructure || !currentStructure.isRoot) {
      return;
    }

    if (!fs.existsSync(currentStructure.uri)) {
      Storage.store("workbench.workspace.folder.structure", null);
      return;
    }

    const updatedStructure = await _get(currentStructure.uri);

    Storage.store("workbench.workspace.folder.structure", updatedStructure);
  } catch (error) {}
}

ipcMain.handle("workbench.workspace.folder.open", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });

  if (result.canceled) {
    return null;
  }

  const _path = result.filePaths[0]!;
  const structure = await _get(_path);

  Storage.store("workbench.workspace.folder.structure", structure);
  _watch(_path);

  workbench.webContents.reload();
});

ipcMain.handle(
  "workbench.workspace.folder.get.child",
  async (event, folderUri: string) => {
    try {
      const currentStructure = Storage.get(
        "workbench.workspace.folder.structure"
      ) as IFolderStructure;

      if (!currentStructure) {
        return { success: false, error: "No structure found" };
      }

      const folderContent = await _get(folderUri);

      const updatedStructure = _update(
        currentStructure,
        folderUri,
        folderContent
      );

      Storage.store("workbench.workspace.folder.structure", updatedStructure);

      return { success: true, structure: updatedStructure };
    } catch (error) {
      return { success: false, error: error };
    }
  }
);

function _getRoot(): string | null {
  const currentStructure = Storage.get(
    "workbench.workspace.folder.structure"
  ) as IFolderStructure;

  if (!currentStructure || !currentStructure.isRoot) {
    return null;
  }

  return currentStructure.uri;
}

async function _init() {
  await _refresh();

  const rootPath = _getRoot();
  if (rootPath) {
    _watch(rootPath);
  }
}

_init();
