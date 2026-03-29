import { Chat } from "@ridit/dev";
import { event_emitter } from "../../shared/emitter";
import { UI_SET_STATUS_BAR, UI_SHOW_NOTIFICATION } from "../../../shared/ipc/channels";

export function register_ui_tools(chat: Chat) {
  chat.registerTool({
    name: "showNotification",
    description: "Show a brief toast notification to the user — use for confirmations, warnings, or status updates",
    parameters: {
      message: { type: "string", description: "The text to display" },
      type: { type: "string", description: "One of: info, success, warning, error" },
    },
    async onRun({ message, type = "info" }) {
      event_emitter.emit("window.webContents.send", UI_SHOW_NOTIFICATION, message, type);
      return { ok: true };
    },
  });

  chat.registerTool({
    name: "setStatusBar",
    description: "Set a temporary message in the status bar at the bottom of the editor",
    parameters: {
      message: { type: "string", description: "The text to display, or null to clear" },
    },
    async onRun({ message }) {
      event_emitter.emit("window.webContents.send", UI_SET_STATUS_BAR, message);
      return { ok: true };
    },
  });
}
