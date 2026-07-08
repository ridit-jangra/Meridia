import { ipcMain, type WebContents } from "electron";
import { randomUUID } from "crypto";
import {
  CHAT_PERMISSION_REQUEST,
  CHAT_RESOLVE_PERMISSION,
} from "../../shared/ipc/channels";
import type {
  PermissionDecision,
  PermissionRequestPayload,
} from "../../shared/types/chat.types";

interface PendingPermission {
  session_id: string;
  resolve: (decision: PermissionDecision) => void;
}

const pending = new Map<string, PendingPermission>();

const auto_approved = new Set<string>();

ipcMain.handle(
  CHAT_RESOLVE_PERMISSION,
  (
    _e,
    _session_id: string,
    permission_id: string,
    decision: PermissionDecision,
  ) => {
    const p = pending.get(permission_id);
    if (!p) return;
    pending.delete(permission_id);
    if (decision === "allow_session") auto_approved.add(p.session_id);
    p.resolve(decision);
  },
);

export function set_session_auto_approve(
  session_id: string,
  on: boolean,
): void {
  if (on) auto_approved.add(session_id);
  else auto_approved.delete(session_id);
}

export function is_session_auto_approved(session_id: string): boolean {
  return auto_approved.has(session_id);
}

const PERMISSION_TIMEOUT = 5 * 60_000; 

export function request_permission(req: {
  sender: WebContents;
  session_id: string;
  tool: string;
  title: string;
  description: string;
  kind?: PermissionRequestPayload["kind"];
  diff?: PermissionRequestPayload["diff"];
}): Promise<PermissionDecision> {
  if (auto_approved.has(req.session_id)) return Promise.resolve("allow");

  const id = randomUUID();
  return new Promise<PermissionDecision>((resolve) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      resolve("deny");
    }, PERMISSION_TIMEOUT);

    pending.set(id, {
      session_id: req.session_id,
      resolve: (decision) => {
        clearTimeout(timer);
        resolve(decision);
      },
    });

    const payload: PermissionRequestPayload = {
      id,
      session_id: req.session_id,
      tool: req.tool,
      title: req.title,
      description: req.description,
      kind: req.kind ?? "generic",
      diff: req.diff,
    };
    req.sender.send(CHAT_PERMISSION_REQUEST, payload);
  });
}
