import {
  CURRENT_WORKSPACE_PATH,
  WORKSPACES_DATA,
} from "../../shared/storage-keys";
import { IWorkspace } from "../../shared/types/workspace.types";
import { event_emitter } from "../shared/emitter";
import { storage } from "./storage-service";
import { dialog } from "electron";
import path from "path";

function parse_json<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || value.trim() === "") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

class workspace_service {
  private async read_all(): Promise<IWorkspace[]> {
    const raw = await storage.get(WORKSPACES_DATA);
    return parse_json<IWorkspace[]>(raw, []);
  }

  private async write_all(list: IWorkspace[]): Promise<void> {
    await storage.set(WORKSPACES_DATA, JSON.stringify(list));
  }

  public async store_workspace(
    workspace_path: string,
    data: Partial<IWorkspace>,
  ): Promise<void> {
    const current = await this.read_all();

    const normalized: IWorkspace = {
      name: data.name ?? path.basename(workspace_path),
      path: data.path ?? workspace_path,
      editor_tabs: data.editor_tabs ?? [],
    };

    const next = [
      ...current.filter((w) => w.path !== workspace_path),
      normalized,
    ];

    await this.write_all(next);
  }

  public async get_workspace(
    workspace_path: string,
  ): Promise<IWorkspace | null> {
    const current = await this.read_all();
    return current.find((w) => w.path === workspace_path) ?? null;
  }

  public async get_current_workspace_path(): Promise<string | null> {
    const current_workspace_path = (await storage.get(
      CURRENT_WORKSPACE_PATH,
    )) as string | undefined;

    if (!current_workspace_path || current_workspace_path.trim() === "")
      return null;

    return current_workspace_path;
  }

  public async set_current_workspace_path(folder_path: string): Promise<void> {
    await storage.set(CURRENT_WORKSPACE_PATH, folder_path);
  }

  public async ask_update_workspace(): Promise<void> {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    if (result.canceled) return;

    const folder_path = result.filePaths[0];

    await this.store_workspace(folder_path, {});
    await this.set_current_workspace_path(folder_path);

    event_emitter.emit("window.reload");
  }

  public async update_workspace(
    folder_path: string,
    updates: Partial<IWorkspace>,
  ): Promise<IWorkspace | null> {
    const existing = await this.get_workspace(folder_path);
    if (!existing) return null;

    const updated: IWorkspace = {
      ...existing,
      ...updates,
      path: updates.path ?? existing.path,
      name: updates.name ?? existing.name,
      editor_tabs: updates.editor_tabs ?? existing.editor_tabs,
    };

    await this.store_workspace(folder_path, updated);
    return updated;
  }
}

export const workspace = new workspace_service();