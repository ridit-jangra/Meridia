import { Chat } from "@ridit/dev";
import { event_emitter } from "../../shared/emitter";
import { TERMINAL_RUN_FILE, TERMINAL_RUN_COMMAND } from "../../../shared/ipc/channels";

export function register_terminal_tools(chat: Chat) {
  chat.registerTool({
    name: "runFile",
    description: "Execute a source file in the terminal using the appropriate language runtime",
    parameters: {
      path: { type: "string", description: "Absolute path to the file to run" },
    },
    async onRun({ path }) {
      event_emitter.emit("window.webContents.send", TERMINAL_RUN_FILE, path);
      return { ok: true };
    },
  });

  chat.registerTool({
    name: "runCommand",
    description: "Run a shell command in the terminal",
    parameters: {
      command: { type: "string", description: "Shell command to execute" },
    },
    async onRun({ command }) {
      event_emitter.emit("window.webContents.send", TERMINAL_RUN_COMMAND, command);
      return { ok: true };
    },
  });
}
