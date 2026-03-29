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
}

export interface IChatTool {
  tool: string;
  args: unknown;
  result: unknown;
}

export interface IChatResult {
  message: string;
  tools: IChatTool[];
  error?: string;
}
