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
  private async read_all(): Promise<IWorkspace[]> {
    const raw = await storage.get(WORKSPACES_DATA);
    if (!raw || !Array.isArray(raw)) return [];
    return raw as IWorkspace[];
  }

  private async write_all(list: IWorkspace[]): Promise<void> {
    // Deduplicate by path before writing — last entry wins
    const seen = new Map<string, IWorkspace>();
    for (const w of list) seen.set(w.path, w);
    await storage.set(WORKSPACES_DATA, Array.from(seen.values()));
  }

  public async store_workspace(
    workspace_path: string,
    data: Partial<IWorkspace>,
  ): Promise<void> {
    const current = await this.read_all();
    const existing = current.find((w) => w.path === workspace_path);

    const normalized: IWorkspace = {
      ...existing,
      ...data,
      name: data.name ?? existing?.name ?? path.basename(workspace_path),
      path: workspace_path,
      editor_tabs: data.editor_tabs ?? existing?.editor_tabs ?? [],
      terminal_tabs: data.terminal_tabs ?? existing?.terminal_tabs ?? [],
    };

    // Deduplicate terminal_tabs by id
    normalized.terminal_tabs = Array.from(
      new Map(normalized.terminal_tabs.map((t) => [t.id, t])).values(),
    );

    // Deduplicate editor_tabs by file_path
    normalized.editor_tabs = Array.from(
      new Map(normalized.editor_tabs.map((t) => [t.file_path, t])).values(),
    );

    await this.write_all([
      ...current.filter((w) => w.path !== workspace_path),
      normalized,
    ]);
  }

  public async get_workspace(
    workspace_path: string,
  ): Promise<IWorkspace | null> {
    const current = await this.read_all();
    return current.find((w) => w.path === workspace_path) ?? null;
  }

  public async get_current_workspace_path(): Promise<string | null> {
    const val = await storage.get(CURRENT_WORKSPACE_PATH);
    if (!val || typeof val !== "string" || val.trim() === "") return null;
    return val;
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

    await this.store_workspace(folder_path, { ...existing, ...updates });

    return await this.get_workspace(folder_path);
  }
}

export const workspace = new workspace_service();
