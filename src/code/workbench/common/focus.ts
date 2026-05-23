import { editor_events } from "../../platform/events/editor.events";
import { terminal } from "../../platform/terminal/terminal.service";

export function focus_terminal() {
  (document.activeElement as HTMLElement | null)?.blur();

  setTimeout(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        terminal.focus();
      });
    });
  }, 50);

  console.log("focusing terminal");
}

export function is_terminal_focus() {
  return terminal.is_focus();
}

export function focus_editor() {
  terminal.unfocus();

  setTimeout(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        editor_events.emit("focus");
      });
    });
  }, 50);

  console.log("focusing editor");
}
