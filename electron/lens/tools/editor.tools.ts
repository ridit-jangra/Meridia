import { ipcMain } from "electron";
import { Chat } from "@ridit/dev";
import fs from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { event_emitter } from "../../shared/emitter";
import { workspace } from "../../main-services/workspace-service";
import {
  EDITOR_ACTIVE_FILE,
  EDITOR_OPEN_FILE,
  EDITOR_SCROLL_TO_LINE,
  EDITOR_SELECTION,
} from "../../../shared/ipc/channels";

async function resolve_path(p: string): Promise<string> {
  if (isAbsolute(p)) return p;
  const root = await workspace.get_current_workspace_path();
  return root ? join(root, p) : p;
}

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
    description: "Open a file in the code editor — accepts absolute or workspace-relative paths",
    parameters: {
      path: { type: "string", description: "Absolute or workspace-relative path to the file" },
    },
    async onRun({ path }) {
      const resolved = await resolve_path(path);
      event_emitter.emit("window.webContents.send", EDITOR_OPEN_FILE, resolved);
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
    description: "Get the full text content of the file currently open in the editor, or of a specific file by path",
    parameters: {
      path: { type: "string", description: "Absolute or workspace-relative path (omit to use the active file)" },
    },
    async onRun({ path }) {
      const target = path ? await resolve_path(path) : _active_file;
      if (!target) return { content: null };
      const content = await fs.readFile(target, "utf8");
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
      path: { type: "string", description: "Absolute or workspace-relative path to the file" },
      line: { type: "number", description: "1-based line number to scroll to" },
    },
    async onRun({ path, line }) {
      const resolved = await resolve_path(path);
      event_emitter.emit("window.webContents.send", EDITOR_SCROLL_TO_LINE, resolved, line);
      return { ok: true };
    },
  });
}
