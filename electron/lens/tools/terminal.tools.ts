import { ipcMain } from "electron";
import { Chat } from "@ridit/dev";
import { event_emitter } from "../../shared/emitter";
import {
  TERMINAL_GET_OUTPUT,
  TERMINAL_OUTPUT_RESPONSE,
  TERMINAL_RUN_COMMAND,
  TERMINAL_RUN_FILE,
} from "../../../shared/ipc/channels";

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

  chat.registerTool({
    name: "getTerminalOutput",
    description: "Read the recent output from the terminal, useful for checking build results, test output, or error messages",
    parameters: {
      lines: { type: "number", description: "Maximum number of recent lines to return (default 50)" },
    },
    async onRun({ lines = 50 }) {
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          ipcMain.removeAllListeners(TERMINAL_OUTPUT_RESPONSE);
          resolve({ output: null });
        }, 3000);

        ipcMain.once(TERMINAL_OUTPUT_RESPONSE, (_, output: string) => {
          clearTimeout(timer);
          resolve({ output });
        });

        event_emitter.emit("window.webContents.send", TERMINAL_GET_OUTPUT, lines);
      });
    },
  });
}
