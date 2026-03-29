import { ipcMain, BrowserWindow } from "electron";
import { Chat } from "@ridit/dev";
import {
  CHAT_PUSH,
  EDITOR_OPEN_FILE,
  TERMINAL_RUN_FILE,
} from "../../shared/ipc/channels";
import type { IChatContext } from "../../shared/types/chat.types";
import { join } from "path";
import { homedir } from "os";
import { event_emitter } from "../shared/emitter";

const sessions = new Map<string, Chat>();

function get_session(session_id: string): Chat {
  if (!sessions.has(session_id)) {
    const chat = new Chat(
      session_id,
      true,
      join(homedir(), ".meridia", "lens-runtime-tools.json"),
    );

    chat.registerTool({
      name: "openFile",
      description: "Open a file in the Meridia editor",
      parameters: {
        path: { type: "string", description: "path to the file" },
      },
      async onRun({ path }) {
        event_emitter.emit("window.webContents.send", EDITOR_OPEN_FILE, path);
        return { ok: true };
      },
    });

    chat.registerTool({
      name: "runFile",
      description: "Run a file in the Meridia terminal",
      parameters: {
        path: { type: "string", description: "path to the file" },
      },
      async onRun({ path }) {
        event_emitter.emit("window.webContents.send", TERMINAL_RUN_FILE, path);
        return { ok: true };
      },
    });

    chat.registerTool({
      name: "getActiveFile",
      description: "Get the currently open file path in the editor",
      parameters: {},
      async onRun() {
        // const path = storage.get("editor:activeFile", null);
        // return { path }
      },
    });

    sessions.set(session_id, chat);
  }
  return sessions.get(session_id)!;
}

ipcMain.handle(
  CHAT_PUSH,
  async (_, session_id: string, message: string, context?: IChatContext) => {
    const chat = get_session(session_id);
    const result = await chat.push(message, context);
    console.log("[chat-ipc] result:", JSON.stringify(result, null, 2), message);
    return { message: result.message, tools: result.tools };
  },
);
