import { ipcMain } from "electron";
import { Chat } from "@ridit/dev";
import { event_emitter } from "../../shared/emitter";
import { EDITOR_OPEN_FILE, EDITOR_ACTIVE_FILE } from "../../../shared/ipc/channels";

let _active_file: string | null = null;

ipcMain.on(EDITOR_ACTIVE_FILE, (_, path: string) => {
  _active_file = path;
});

export function register_editor_tools(chat: Chat) {
  chat.registerTool({
    name: "openFile",
    description: "Open a file in the code editor",
    parameters: {
      path: { type: "string", description: "Absolute path to the file" },
    },
    async onRun({ path }) {
      event_emitter.emit("window.webContents.send", EDITOR_OPEN_FILE, path);
      return { ok: true };
    },
  });

  chat.registerTool({
    name: "getActiveFile",
    description: "Get the file path currently open and focused in the editor",
    parameters: {},
    async onRun() {
      return { path: _active_file };
    },
  });
}
