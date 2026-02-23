import {
  CURRENT_WORKSPACE_PATH,
  WORKSPACES_DATA,
} from "../../shared/storage-keys";
import { IWorkspace } from "../../shared/types/workspace.types";
import { event_emitter } from "../shared/emitter";
import { storage } from "./storage-service";
import { dialog } from "electron";
import path from "path";

class workspace_service {
  public async store_workspace(workspace_path: string): Promise<void> {
    const current =
      ((await storage.get(WORKSPACES_DATA)) as IWorkspace[] | undefined) ?? [];

    const exists = current.some((w) => w.path === workspace_path);
    if (exists) return;

    const updated: IWorkspace[] = [
      ...current,
      {
        name: path.basename(workspace_path),
        editor_tabs: [],
        path: workspace_path,
      },
    ];

    storage.set(WORKSPACES_DATA, updated);
  }

  public async get_workspace(
    workspace_path: string,
  ): Promise<IWorkspace | null> {
    const current_workspaces = (await storage.get(
      WORKSPACES_DATA,
    )) as IWorkspace[];
    if (!current_workspaces) return null;

    const target = current_workspaces.find(
      (w) => w.path === workspace_path,
    ) as IWorkspace;
    if (!target) return null;

    return target;
  }

  public async get_current_workspace_path(): Promise<string | null> {
    const current_workspace_path = (await storage.get(
      CURRENT_WORKSPACE_PATH,
    )) as string;
    if (!current_workspace_path) return null;

    return current_workspace_path;
  }

  public async set_current_workspace_path(folder_path: string): Promise<void> {
    storage.set(CURRENT_WORKSPACE_PATH, folder_path);
  }

  public async ask_update_workspace(): Promise<void> {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    if (result.canceled) return;

    const folder_path = result.filePaths[0];

    await this.store_workspace(folder_path);
    await this.set_current_workspace_path(folder_path);

    event_emitter.emit("window.reload");
  }
}

export const workspace = new workspace_service();
