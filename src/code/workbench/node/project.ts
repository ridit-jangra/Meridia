import { ipcMain } from "electron";
import { Storage } from "./storage.js";
import { IFolderStructure } from "../workbench.types.js";
import path from "path";
import fs from "fs";

ipcMain.handle("workbench.workspace.details", () => {
  const folder_structure = Storage.get(
    "workbench.workspace.folder.structure"
  ) as IFolderStructure;
  if (!folder_structure) return false;

  const uri = folder_structure.uri;
  const meridiaUri = path.join(uri, ".meridia");

  if (!fs.existsSync(meridiaUri)) return false;

  const configFile = path.join(meridiaUri, "editor.json");
  const data = JSON.parse(fs.readFileSync(configFile, { encoding: "utf-8" }));

  return data;
});
