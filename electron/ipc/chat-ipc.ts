import { ipcMain } from "electron";
import { Chat } from "@ridit/dev";
import { CHAT_PUSH } from "../../shared/ipc/channels";
import type { IChatContext } from "../../shared/types/chat.types";

const sessions = new Map<string, Chat>();

function get_session(session_id: string): Chat {
  if (!sessions.has(session_id)) {
    sessions.set(session_id, new Chat(session_id, true));
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
