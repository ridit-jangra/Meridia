export interface IChatContextFile {
  name: string;
  path: string;
  content: string;
  prompt?: string;
}

export interface IChatContext {
  cwd: string;
  files: IChatContextFile[];
  prompt?: string;
  thinking?: boolean;
  allowEdits?: boolean;
}

// Sub-agent lifecycle events streamed main -> renderer so the UI can show a
// nested "agent" card (task + live steps + final result).
export interface AgentEvent {
  id: string;
  type: "start" | "step" | "done" | "error";
  title?: string;
  step?: { tool: string; preview: string };
  result?: string;
  error?: string;
}

export type PermissionDecision = "allow" | "deny" | "allow_session";

export interface PermissionRequestPayload {
  id: string;
  session_id: string;
  tool: string;
  title: string;
  description: string;
  kind: "generic" | "edit" | "command";
  diff?: { path: string; prevContent: string; newContent: string };
}

export interface IChatTool {
  tool: string;
  args: unknown;
  result: unknown;
}

export interface Permission {
  id?: string;
  tool: string;
  description: string;
}

export interface IChatResult {
  message: string;
  model?: string;
  tools: any[];
  error?: string;
  permissionRequired?: Permission[];
}
