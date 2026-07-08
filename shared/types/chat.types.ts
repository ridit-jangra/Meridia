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
