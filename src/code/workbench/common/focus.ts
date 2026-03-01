import { editor_events } from "../../platform/events/editor.events";
import { terminal } from "../contrib/terminal/common/terminal.service";

export function focus_terminal() {
  (document.activeElement as HTMLElement | null)?.blur();

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      terminal.focus();
    });
  });
}

export function focus_editor() {
  terminal.unfocus();

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      editor_events.emit("focus");
    });
  });
}
