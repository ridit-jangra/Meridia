import { ipcMain } from "electron";
import { Milo, Tool } from "@ridit/dev";
import {
  CHAT_PUSH,
  CHAT_RUN_TOOL,
  CHAT_SKIP_TOOL,
  CHAT_RESOLVE_PERMISSION,
  CHAT_PERMISSION_REQUEST,
  CHAT_TOOL_CALL,
  CHAT_TOOL_RESULT,
} from "../../shared/ipc/channels";
import type { IChatContext, IChatResult } from "../../shared/types/chat.types";

Milo.start();

const sessions = new Map<string, Milo>();
// pending permission resolvers: permId → resolve fn
const pending = new Map<string, (decision: string) => void>();

function get_session(session_id: string): Milo {
  if (!sessions.has(session_id)) {
    sessions.set(session_id, new Milo("agent"));
  }
  return sessions.get(session_id)!;
}

ipcMain.handle(
  CHAT_PUSH,
  async (
    event,
    session_id: string,
    message: string,
    _context?: IChatContext,
  ): Promise<IChatResult> => {
    if (!(await Milo.isRunning())) {
      return {
        message,
        tools: [],
        permissionRequired: [],
        model: "gpt",
        error: undefined,
      } as IChatResult;
    }

    const sender = event.sender;
    const milo = get_session(session_id);

    try {
      const resultString = await milo.chat(message, async (event) => {
        if (event.type === "tool_call") {
          console.log("[ipc] raw tool_call event:", JSON.stringify(event));

          sender.send(CHAT_TOOL_CALL, {
            id: event.id,
            tool: event.toolName,
            args: (event as any).input,
          });
        }
        if (event.type === "tool_result") {
          sender.send(CHAT_TOOL_RESULT, {
            id: event.id,
            tool: event.toolName,
            result: event.result,
          });
        }

        if (event.type === "permission_request") {
          // push to renderer and WAIT for user decision before continuing
          const decision = await new Promise<string>((resolve) => {
            pending.set(event.id, resolve);
            sender.send(CHAT_PERMISSION_REQUEST, {
              id: event.id,
              tool: event.tool,
              args: event.args,
            });
          });
          milo.resolvePermission(event.id, decision as any);
        }
      });

      return {
        message: resultString,
        tools: [],
        permissionRequired: [],
        model: "gpt",
        error: undefined,
      };
    } catch (e) {
      return {
        error: e instanceof Error ? e.message : String(e),
        message: "",
        tools: [],
        permissionRequired: [],
        model: "gpt",
      };
    }
  },
);

ipcMain.handle(
  CHAT_RESOLVE_PERMISSION,
  async (_, _session_id: string, permission_id: string, decision: string) => {
    const resolve = pending.get(permission_id);
    if (resolve) {
      pending.delete(permission_id);
      resolve(decision);
    }
  },
);

ipcMain.handle(
  CHAT_RUN_TOOL,
  async (_, _session_id: string, _tool: Tool) => {},
);
ipcMain.handle(
  CHAT_SKIP_TOOL,
  async (_, _session_id: string, _tool: Tool) => {},
);
