import path from "path";
import { INode, TWatchEvent } from "../../shared/types/explorer.types";
import { generate_uri } from "../../shared/uri/generate";
import { event_emitter } from "./emitter";

type PendingEvent =
  | { type: "add"; node: INode }
  | { type: "remove"; uri: string }
  | { type: "rename"; from: string; to: string }
  | { type: "change"; uri: string };

const pending = new Map<
  string,
  { timer: ReturnType<typeof setTimeout>; event: PendingEvent }
>();

const DEBOUNCE_MS = 50;

function flush(key: string) {
  const entry = pending.get(key);
  if (!entry) return;
  pending.delete(key);

  const e = entry.event;

  if (e.type === "add") {
    event_emitter.emit(
      "window.webContents.send",
      "workbench.explorer.add",
      e.node,
    );
  } else if (e.type === "remove") {
    event_emitter.emit(
      "window.webContents.send",
      "workbench.explorer.remove",
      e.uri,
    );
  } else if (e.type === "rename") {
    event_emitter.emit(
      "window.webContents.send",
      "workbench.explorer.rename",
      e.from,
      e.to,
    );
  } else {
    event_emitter.emit(
      "window.webContents.send",
      "workbench.explorer.change",
      e.uri,
    );
  }
}

function debounce(key: string, event: PendingEvent) {
  const existing = pending.get(key);
  if (existing) clearTimeout(existing.timer);
  const timer = setTimeout(() => flush(key), DEBOUNCE_MS);
  pending.set(key, { timer, event });
}

export function attach_event_emitter(e: TWatchEvent) {
  if (e.type === "add") {
    const uri = generate_uri(e.path);
    const node: INode = {
      child_nodes: [],
      id: uri,
      name: path.basename(e.path),
      path: uri,
      type: e.isDir ? "folder" : "file",
    };
    debounce(uri, { type: "add", node });
  } else if (e.type === "remove") {
    const uri = generate_uri(e.path);
    debounce(uri, { type: "remove", uri });
  } else if (e.type === "rename") {
    const from = generate_uri(e.from);
    const to = generate_uri(e.to);
    debounce(from, { type: "rename", from, to });
  } else {
    const uri = generate_uri(e.path);
    debounce(uri, { type: "change", uri });
  }
}
