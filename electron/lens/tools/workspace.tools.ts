import { Chat } from "@ridit/dev";
import { workspace } from "../../main-services/workspace-service";

export function register_workspace_tools(chat: Chat) {
  chat.registerTool({
    name: "getWorkspacePath",
    description: "Get the root directory path of the currently open project",
    parameters: {},
    async onRun() {
      const path = await workspace.get_current_workspace_path();
      return { path };
    },
  });

  chat.registerTool({
    name: "getOpenFiles",
    description: "Get the list of files currently open in the editor",
    parameters: {},
    async onRun() {
      const root = await workspace.get_current_workspace_path();
      if (!root) return { files: [] };
      const ws = await workspace.get_workspace(root);
      return {
        files: (ws?.editor_tabs ?? []).map((t) => t.file_path),
      };
    },
  });
}
