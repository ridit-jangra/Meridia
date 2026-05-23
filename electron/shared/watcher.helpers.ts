import path from "path";
import { INode, TWatchEvent } from "../../shared/types/explorer.types";
import { generate_uri } from "../../shared/uri/generate";
import { event_emitter } from "./emitter";

type PendingEvent =
  | { type: "add"; node: INode }
  | { type: "remove"; uri: string }
  | { type: "remove_many"; uris: string[] }
  | { type: "rename"; from: string; to: string }
  | { type: "change"; uri: string };

const pending = new Map<
  string,
  { timer: ReturnType<typeof setTimeout>; event: PendingEvent }
>();

const pending_removes: string[] = [];
let remove_batch_timer: ReturnType<typeof setInterval> | null = null;

const pending_adds: INode[] = [];
let add_batch_timer: ReturnType<typeof setInterval> | null = null;

const DEBOUNCE_MS = 50;
const MAX_NODES = 50000;
let total_nodes = 0;

export function reset_watcher_state() {
  total_nodes = 0;
  pending_adds.length = 0;
  pending_removes.length = 0;
  if (add_batch_timer) {
    clearInterval(add_batch_timer);
    add_batch_timer = null;
  }
  if (remove_batch_timer) {
    clearInterval(remove_batch_timer);
    remove_batch_timer = null;
  }
  add_timing_active = false;
  remove_timing_active = false;
}

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
  } else if (e.type === "change") {
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

function flush_removes() {
  if (!pending_removes.length) return;
  const batch = [...pending_removes];
  pending_removes.length = 0;

  console.log("flushing", batch.length, "removes");
  console.time("flush_removes");

  total_nodes = Math.max(0, total_nodes - batch.length);

  if (batch.length === 1) {
    event_emitter.emit(
      "window.webContents.send",
      "workbench.explorer.remove",
      batch[0],
    );
  } else {
    event_emitter.emit(
      "window.webContents.send",
      "workbench.explorer.remove_many",
      batch,
    );
  }

  console.timeEnd("flush_removes");
}

let remove_timing_active = false;

function batch_remove(uri: string) {
  if (pending_removes.length === 0 && !remove_timing_active) {
    console.time("batch_collect");
    remove_timing_active = true;
    remove_batch_timer = setInterval(() => {
      if (pending_removes.length > 0) {
        console.timeEnd("batch_collect");
        remove_timing_active = false;
        flush_removes();
        console.time("batch_collect");
        remove_timing_active = true;
      } else {
        clearInterval(remove_batch_timer!);
        remove_batch_timer = null;
        if (remove_timing_active) {
          console.timeEnd("batch_collect");
          remove_timing_active = false;
        }
      }
    }, 200);
  }
  pending_removes.push(uri);
}

function flush_adds() {
  if (!pending_adds.length) return;

  const remaining = MAX_NODES - total_nodes;
  if (remaining <= 0) {
    console.warn("max nodes reached, skipping", pending_adds.length, "adds");
    pending_adds.length = 0;
    return;
  }

  const batch = pending_adds.splice(0, remaining);
  total_nodes += batch.length;

  if (pending_adds.length > 0) {
    console.warn("max nodes reached, dropped", pending_adds.length, "adds");
    pending_adds.length = 0;
  }

  console.log("flushing", batch.length, "adds, total:", total_nodes);
  console.time("flush_adds");

  if (batch.length === 1) {
    event_emitter.emit(
      "window.webContents.send",
      "workbench.explorer.add",
      batch[0],
    );
  } else {
    event_emitter.emit(
      "window.webContents.send",
      "workbench.explorer.add_many",
      batch,
    );
  }

  console.timeEnd("flush_adds");
}

let add_timing_active = false;

function batch_add(node: INode) {
  if (total_nodes >= MAX_NODES) {
    console.warn("max nodes reached, ignoring add:", node.path);
    return;
  }

  if (pending_adds.length === 0 && !add_timing_active) {
    console.time("batch_add_collect");
    add_timing_active = true;
    add_batch_timer = setInterval(() => {
      if (pending_adds.length > 0) {
        console.timeEnd("batch_add_collect");
        add_timing_active = false;
        flush_adds();
      } else {
        clearInterval(add_batch_timer!);
        add_batch_timer = null;
        if (add_timing_active) {
          console.timeEnd("batch_add_collect");
          add_timing_active = false;
        }
      }
    }, 200);
  }
  pending_adds.push(node);
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
    batch_add(node);
  } else if (e.type === "remove") {
    const uri = generate_uri(e.path);
    batch_remove(uri);
  } else if (e.type === "rename") {
    const from = generate_uri(e.from);
    const to = generate_uri(e.to);
    debounce(from, { type: "rename", from, to });
  } else {
    const uri = generate_uri(e.path);
    debounce(uri, { type: "change", uri });
  }
}
