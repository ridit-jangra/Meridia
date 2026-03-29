import { ipcMain } from "electron";
import { Chat } from "@ridit/dev";
import { CHAT_PUSH } from "../../shared/ipc/channels";
import type { IChatContext } from "../../shared/types/chat.types";
import { join } from "path";
import { homedir } from "os";
import { register_editor_tools } from "../lens/tools/editor.tools";
import { register_terminal_tools } from "../lens/tools/terminal.tools";
import { register_fs_tools } from "../lens/tools/fs.tools";
import { register_workspace_tools } from "../lens/tools/workspace.tools";

const sessions = new Map<string, Chat>();

function get_session(session_id: string): Chat {
  if (!sessions.has(session_id)) {
    const chat = new Chat(
      session_id,
      true,
      join(homedir(), ".meridia", "lens-runtime-tools.json"),
    );

    register_editor_tools(chat);
    register_terminal_tools(chat);
    register_fs_tools(chat);
    register_workspace_tools(chat);

    sessions.set(session_id, chat);
  }
  return sessions.get(session_id)!;
}

ipcMain.handle(
  CHAT_PUSH,
  async (_, session_id: string, message: string, context?: IChatContext) => {
    const chat = get_session(session_id);
    const result = await chat.push(message, context);
    return { message: result.message, tools: result.tools };
  },
);
