import { WORKSPACES_DATA } from "../../shared/storage-keys";
import { IWorkspace } from "../../shared/workspace.types";
import { storage } from "./storage-service";
import path from "path";

class workspace_service {
  public async store_workspace(workspace_path: string): Promise<void> {
    const current_workspaces = (await storage.get(WORKSPACES_DATA)) as Record<
      string,
      IWorkspace
    >;
    current_workspaces[workspace_path] = {
      editor_tabs: [],
      name: path.dirname(workspace_path),
    };

    storage.set(WORKSPACES_DATA, current_workspaces);
  }
}

export const workspace = new workspace_service();
