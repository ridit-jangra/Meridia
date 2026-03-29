import { Tool } from "@ridit/dev";

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
}

export interface IChatTool {
  tool: string;
  args: unknown;
  result: unknown;
}

export interface Permission {
  tool: string;
  description: string;
}

export interface IChatResult {
  message: string;
  model?: string;
  tools: Tool[];
  error?: string;
  permissionRequired?: Permission[];
}
