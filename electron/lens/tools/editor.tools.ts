import { ipcMain } from "electron";
import { Chat } from "@ridit/dev";
import fs from "node:fs/promises";
import { event_emitter } from "../../shared/emitter";
import {
  EDITOR_ACTIVE_FILE,
  EDITOR_OPEN_FILE,
  EDITOR_SCROLL_TO_LINE,
  EDITOR_SELECTION,
} from "../../../shared/ipc/channels";

let _active_file: string | null = null;
let _selection: string | null = null;

ipcMain.on(EDITOR_ACTIVE_FILE, (_, path: string) => {
  _active_file = path;
});

ipcMain.on(EDITOR_SELECTION, (_, text: string) => {
  _selection = text;
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

  chat.registerTool({
    name: "getFileContent",
    description: "Get the full text content of the file currently open in the editor",
    parameters: {},
    async onRun() {
      if (!_active_file) return { content: null };
      const content = await fs.readFile(_active_file, "utf8");
      return { content };
    },
  });

  chat.registerTool({
    name: "getSelection",
    description: "Get the text the user currently has selected in the editor",
    parameters: {},
    async onRun() {
      return { selection: _selection };
    },
  });

  chat.registerTool({
    name: "scrollToLine",
    description: "Scroll the editor to a specific line number in a file, opening it first if needed",
    parameters: {
      path: { type: "string", description: "Absolute path to the file" },
      line: { type: "number", description: "1-based line number to scroll to" },
    },
    async onRun({ path, line }) {
      event_emitter.emit("window.webContents.send", EDITOR_SCROLL_TO_LINE, path, line);
      return { ok: true };
    },
  });
}
