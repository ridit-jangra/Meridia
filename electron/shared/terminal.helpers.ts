import { IPty } from "node-pty";
import { NODE_PTY_DATA } from "../../shared/ipc/channels";
import { event_emitter } from "./emitter";

export function attach_event_emitter(t: IPty, id: string) {
  t.onData((e) => {
    event_emitter.emit("window.webContents.send", NODE_PTY_DATA, id, e);
  });
}
