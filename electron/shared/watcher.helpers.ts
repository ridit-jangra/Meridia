import path from "path";
import { INode, TWatchEvent } from "../../shared/types/explorer.types";
import { generate_uri } from "../../shared/uri/generate";
import { event_emitter } from "./emitter";
import { git } from "../main-services/git-service";

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
const BATCH_FLUSH_MS = 16;
const GIT_STATUS_DEBOUNCE_MS = 150;
const MAX_NODES = 50000;
let total_nodes = 0;

let current_repo_path: string | null = null;

let git_status_timer: ReturnType<typeof setTimeout> | null = null;
let git_status_running = false;
let git_status_pending = false;

export function set_repo_path(p: string | null) {
  current_repo_path = p;
}

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
  if (git_status_timer) {
    clearTimeout(git_status_timer);
    git_status_timer = null;
  }
  git_status_running = false;
  git_status_pending = false;
}

function is_batching() {
  return add_batch_timer !== null || remove_batch_timer !== null;
}

function on_batch_idle() {
  if (git_status_pending) request_git_status();
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
  const batch = pending_removes.splice(0, pending_removes.length);

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

function batch_remove(uri: string) {
  pending_removes.push(uri);
  if (remove_batch_timer) return;
  console.time("batch_collect");
  remove_batch_timer = setInterval(() => {
    console.timeEnd("batch_collect");
    if (pending_removes.length > 0) {
      flush_removes();
      console.time("batch_collect");
    } else {
      clearInterval(remove_batch_timer!);
      remove_batch_timer = null;
      on_batch_idle();
    }
  }, BATCH_FLUSH_MS);
}

function flush_adds() {
  if (!pending_adds.length) return;

  const remaining = MAX_NODES - total_nodes;
  if (remaining <= 0) {
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

function batch_add(node: INode) {
  if (total_nodes >= MAX_NODES) return;

  pending_adds.push(node);
  if (add_batch_timer) return;
  console.time("batch_add_collect");
  add_batch_timer = setInterval(() => {
    console.timeEnd("batch_add_collect");
    if (pending_adds.length > 0) {
      flush_adds();
      console.time("batch_add_collect");
    } else {
      clearInterval(add_batch_timer!);
      add_batch_timer = null;
      on_batch_idle();
    }
  }, BATCH_FLUSH_MS);
}

function request_git_status() {
  if (!current_repo_path) return;
  git_status_pending = true;

  if (is_batching()) return;

  if (git_status_running) return;
  schedule_git_status();
}

function schedule_git_status() {
  if (!current_repo_path) return;
  if (git_status_timer) clearTimeout(git_status_timer);
  git_status_timer = setTimeout(() => {
    git_status_timer = null;

    if (is_batching()) return;
    run_git_status();
  }, GIT_STATUS_DEBOUNCE_MS);
}

function run_git_status() {
  if (!current_repo_path || git_status_running) return;
  git_status_pending = false;
  git_status_running = true;
  console.time("git_push_status");
  Promise.resolve(git.push_status(current_repo_path)).finally(() => {
    console.timeEnd("git_push_status");
    git_status_running = false;

    if (git_status_pending) request_git_status();
  });
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

  if (current_repo_path) {
    request_git_status();
  }
}
