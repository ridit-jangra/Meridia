import { tool, jsonSchema, type ToolSet } from "ai";
import { ipcMain, type WebContents } from "electron";
import fs from "fs/promises";
import path from "path";
import { workspace } from "../main-services/workspace-service";
import {
  EDITOR_OPEN_FILE,
  EDITOR_SCROLL_TO_LINE,
  TERMINAL_AI_RUN,
  TERMINAL_GET_OUTPUT,
  TERMINAL_OUTPUT_RESPONSE,
  LSP_AGENT_REQUEST,
  LSP_AGENT_RESPONSE,
} from "../../shared/ipc/channels";
import { randomUUID } from "crypto";
import { request_permission } from "./permissions";

export interface ToolContext {
  sender: WebContents;

  session_id: string;

  get_active_file: () => string | null;

  get_selection: () => string | null;
}

async function resolve_in_workspace(p?: string): Promise<string> {
  const root = (await workspace.get_current_workspace_path()) ?? process.cwd();
  if (!p || p.trim() === "") return root;
  if (path.isAbsolute(p)) return p;
  return path.join(root, p);
}

const TERMINAL_OUTPUT_TIMEOUT = 4000;

function read_terminal_output(
  sender: WebContents,
  lines: number,
): Promise<string> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      ipcMain.removeListener(TERMINAL_OUTPUT_RESPONSE, handler);
      resolve("");
    }, TERMINAL_OUTPUT_TIMEOUT);

    const handler = (event: Electron.IpcMainEvent, data: string) => {
      if (event.sender !== sender) return;
      clearTimeout(timer);
      ipcMain.removeListener(TERMINAL_OUTPUT_RESPONSE, handler);
      resolve(data);
    };

    ipcMain.on(TERMINAL_OUTPUT_RESPONSE, handler);
    sender.send(TERMINAL_GET_OUTPUT, lines);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

const LSP_REQUEST_TIMEOUT = 15000;

type LspAgentOp =
  | "diagnostics"
  | "hover"
  | "definition"
  | "references"
  | "symbols";

// Round-trips an LSP query to the renderer (which owns the Monaco language
// client) and waits for the correlated response. Mirrors read_terminal_output,
// but correlates by a per-request id since several can be in flight.
function lsp_request(
  sender: WebContents,
  op: LspAgentOp,
  params: { path: string; line?: number; column?: number },
): Promise<unknown> {
  const id = randomUUID();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ipcMain.removeListener(LSP_AGENT_RESPONSE, handler);
      reject(new Error(`LSP ${op} timed out`));
    }, LSP_REQUEST_TIMEOUT);

    const handler = (
      event: Electron.IpcMainEvent,
      res: { id: string; ok: boolean; result?: unknown; error?: string },
    ) => {
      if (event.sender !== sender || res.id !== id) return;
      clearTimeout(timer);
      ipcMain.removeListener(LSP_AGENT_RESPONSE, handler);
      if (res.ok) resolve(res.result);
      else reject(new Error(res.error ?? `LSP ${op} failed`));
    };

    ipcMain.on(LSP_AGENT_RESPONSE, handler);
    sender.send(LSP_AGENT_REQUEST, { id, op, ...params });
  });
}

export function create_tools(ctx: ToolContext): ToolSet {
  const { sender, session_id } = ctx;

  // Ask the user before a destructive action. Returns false if denied.
  const gate = async (req: {
    tool: string;
    title: string;
    description: string;
    kind?: "generic" | "edit" | "command";
    diff?: { path: string; prevContent: string; newContent: string };
  }): Promise<boolean> => {
    const decision = await request_permission({
      sender,
      session_id,
      ...req,
    });
    return decision !== "deny";
  };

  const ReadFileTool = tool({
    description:
      "Read a text file from the workspace. Paths are relative to the open " +
      "workspace folder unless absolute.",
    inputSchema: jsonSchema<{ path: string }>({
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File path, relative to the workspace or absolute.",
        },
      },
      required: ["path"],
      additionalProperties: false,
    }),
    execute: async ({ path: p }) => {
      try {
        const full = await resolve_in_workspace(p);
        const content = await fs.readFile(full, "utf-8");
        return { success: true, path: full, content };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
  });

  const WriteFileTool = tool({
    description:
      "Create or overwrite a file in the workspace, then open it in the editor. " +
      "If only a filename is given it is created at the workspace root. Parent " +
      "directories are created automatically.",
    inputSchema: jsonSchema<{ path: string; content: string }>({
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "Destination path. Relative paths are placed inside the workspace folder.",
        },
        content: { type: "string", description: "Full file contents." },
      },
      required: ["path", "content"],
      additionalProperties: false,
    }),
    execute: async ({ path: p, content }) => {
      try {
        const full = await resolve_in_workspace(p);
        let prev = "";
        try {
          prev = await fs.readFile(full, "utf-8");
        } catch {
          // new file
        }
        const approved = await gate({
          tool: "WriteFileTool",
          title: `Write ${path.basename(full)}`,
          description: full,
          kind: "edit",
          diff: { path: full, prevContent: prev, newContent: content },
        });
        if (!approved) {
          return { success: false, error: "Write rejected by user." };
        }
        await fs.mkdir(path.dirname(full), { recursive: true });
        await fs.writeFile(full, content, "utf-8");
        sender.send(EDITOR_OPEN_FILE, full, "EDITOR_SINGLE");
        return { success: true, path: full };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
  });

  const EditFileTool = tool({
    description:
      "Replace a unique snippet in an existing workspace file with new text, " +
      "then reveal the file in the editor. old_string must match exactly once.",
    inputSchema: jsonSchema<{
      path: string;
      old_string: string;
      new_string: string;
    }>({
      type: "object",
      properties: {
        path: { type: "string", description: "File to edit." },
        old_string: {
          type: "string",
          description: "Exact text to replace (must be unique in the file).",
        },
        new_string: { type: "string", description: "Replacement text." },
      },
      required: ["path", "old_string", "new_string"],
      additionalProperties: false,
    }),
    execute: async ({ path: p, old_string, new_string }) => {
      try {
        const full = await resolve_in_workspace(p);
        const content = await fs.readFile(full, "utf-8");
        const occurrences = content.split(old_string).length - 1;
        if (occurrences === 0) {
          return { success: false, error: "old_string not found in file" };
        }
        if (occurrences > 1) {
          return {
            success: false,
            error: `old_string found ${occurrences} times — must be unique. Add more context.`,
          };
        }
        const updated = content.replace(old_string, new_string);
        const approved = await gate({
          tool: "EditFileTool",
          title: `Edit ${path.basename(full)}`,
          description: full,
          kind: "edit",
          diff: { path: full, prevContent: content, newContent: updated },
        });
        if (!approved) {
          return { success: false, error: "Edit rejected by user." };
        }
        await fs.writeFile(full, updated, "utf-8");
        const line = content
          .slice(0, content.indexOf(old_string))
          .split("\n").length;
        sender.send(EDITOR_SCROLL_TO_LINE, full, line);
        return { success: true, path: full, line };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
  });

  const ListDirTool = tool({
    description:
      "List the entries of a workspace directory. Defaults to the workspace root.",
    inputSchema: jsonSchema<{ path?: string }>({
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Directory to list. Omit for the workspace root.",
        },
      },
      additionalProperties: false,
    }),
    execute: async ({ path: p }) => {
      try {
        const full = await resolve_in_workspace(p);
        const entries = await fs.readdir(full, { withFileTypes: true });
        return {
          success: true,
          path: full,
          entries: entries.map((e) => ({
            name: e.name,
            type: e.isDirectory() ? "directory" : "file",
          })),
        };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
  });

  const CreateDirTool = tool({
    description: "Create a directory (recursively) inside the workspace.",
    inputSchema: jsonSchema<{ path: string }>({
      type: "object",
      properties: {
        path: { type: "string", description: "Directory path to create." },
      },
      required: ["path"],
      additionalProperties: false,
    }),
    execute: async ({ path: p }) => {
      try {
        const full = await resolve_in_workspace(p);
        const approved = await gate({
          tool: "CreateDirTool",
          title: `Create directory ${path.basename(full)}`,
          description: full,
        });
        if (!approved) {
          return { success: false, error: "Denied by user." };
        }
        await fs.mkdir(full, { recursive: true });
        return { success: true, path: full };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
  });

  const OpenFileTool = tool({
    description:
      "Open a file in the Meridia editor so the user can see it. Does not change the file.",
    inputSchema: jsonSchema<{ path: string }>({
      type: "object",
      properties: {
        path: { type: "string", description: "File to open in the editor." },
      },
      required: ["path"],
      additionalProperties: false,
    }),
    execute: async ({ path: p }) => {
      try {
        const full = await resolve_in_workspace(p);
        sender.send(EDITOR_OPEN_FILE, full, "EDITOR_SINGLE");
        return { success: true, path: full };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
  });

  const GotoLineTool = tool({
    description:
      "Open a file in the editor and scroll/reveal a specific line centered in view.",
    inputSchema: jsonSchema<{ path: string; line: number }>({
      type: "object",
      properties: {
        path: { type: "string", description: "File to reveal." },
        line: { type: "number", description: "1-based line number." },
      },
      required: ["path", "line"],
      additionalProperties: false,
    }),
    execute: async ({ path: p, line }) => {
      try {
        const full = await resolve_in_workspace(p);
        sender.send(EDITOR_SCROLL_TO_LINE, full, line);
        return { success: true, path: full, line };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
  });

  const GetActiveFileTool = tool({
    description:
      "Get the file currently focused in the Meridia editor, including its contents. " +
      "Use this to understand what the user is looking at right now.",
    inputSchema: jsonSchema<Record<string, never>>({
      type: "object",
      properties: {},
      additionalProperties: false,
    }),
    execute: async () => {
      const active = ctx.get_active_file();
      if (!active) {
        return { success: false, error: "No file is currently open." };
      }
      try {
        const content = await fs.readFile(active, "utf-8");
        return { success: true, path: active, content };
      } catch {
        return { success: true, path: active, content: null };
      }
    },
  });

  const GetSelectionTool = tool({
    description:
      "Get the text the user has currently selected in the Meridia editor, if any.",
    inputSchema: jsonSchema<Record<string, never>>({
      type: "object",
      properties: {},
      additionalProperties: false,
    }),
    execute: async () => {
      const selection = ctx.get_selection();
      if (!selection) {
        return { success: false, error: "Nothing is selected." };
      }
      return { success: true, selection };
    },
  });

  const RunCommandTool = tool({
    description:
      "Run a shell command in the dedicated 'AI Agent' terminal inside Meridia. " +
      "The terminal is visible to the user, runs in the workspace folder, and the " +
      "user can read or take over the session. Returns the recent terminal output.",
    inputSchema: jsonSchema<{ command: string; wait_ms?: number }>({
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "The command line to execute.",
        },
        wait_ms: {
          type: "number",
          description:
            "How long to wait before capturing output (default 1500ms). Increase for slow commands.",
        },
      },
      required: ["command"],
      additionalProperties: false,
    }),
    execute: async ({ command, wait_ms }) => {
      const approved = await gate({
        tool: "RunCommandTool",
        title: "Run command",
        description: command,
        kind: "command",
      });
      if (!approved) {
        return { success: false, error: "Command rejected by user." };
      }
      sender.send(TERMINAL_AI_RUN, command);
      await sleep(Math.max(0, wait_ms ?? 1500));
      const output = await read_terminal_output(sender, 100);
      return { success: true, command, output };
    },
  });

  const ReadTerminalTool = tool({
    description:
      "Read the most recent output already printed in the Meridia terminal " +
      "(across runs). Use this to inspect command results, errors, or logs.",
    inputSchema: jsonSchema<{ lines?: number }>({
      type: "object",
      properties: {
        lines: {
          type: "number",
          description: "Number of recent lines to read (default 50).",
        },
      },
      additionalProperties: false,
    }),
    execute: async ({ lines }) => {
      const output = await read_terminal_output(sender, lines ?? 50);
      return { success: true, output };
    },
  });

  const LspDiagnosticsTool = tool({
    description:
      "Get language-server diagnostics (errors, warnings, hints) for a file. " +
      "Use this to check whether your edits introduced problems. An empty list " +
      "means no diagnostics are currently reported.",
    inputSchema: jsonSchema<{ path: string }>({
      type: "object",
      properties: {
        path: { type: "string", description: "File to diagnose." },
      },
      required: ["path"],
      additionalProperties: false,
    }),
    execute: async ({ path: p }) => {
      try {
        const full = await resolve_in_workspace(p);
        const result = await lsp_request(sender, "diagnostics", { path: full });
        return { success: true, path: full, diagnostics: result };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
  });

  const LspHoverTool = tool({
    description:
      "Get hover info (type signature, documentation) for the symbol at a " +
      "1-based line/column in a file, from the language server.",
    inputSchema: jsonSchema<{ path: string; line: number; column: number }>({
      type: "object",
      properties: {
        path: { type: "string", description: "File containing the symbol." },
        line: { type: "number", description: "1-based line number." },
        column: { type: "number", description: "1-based column number." },
      },
      required: ["path", "line", "column"],
      additionalProperties: false,
    }),
    execute: async ({ path: p, line, column }) => {
      try {
        const full = await resolve_in_workspace(p);
        const result = await lsp_request(sender, "hover", {
          path: full,
          line,
          column,
        });
        return { success: true, hover: result };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
  });

  const LspDefinitionTool = tool({
    description:
      "Find where the symbol at a 1-based line/column is defined. Returns a " +
      "list of { path, line, column } locations from the language server.",
    inputSchema: jsonSchema<{ path: string; line: number; column: number }>({
      type: "object",
      properties: {
        path: { type: "string", description: "File containing the reference." },
        line: { type: "number", description: "1-based line number." },
        column: { type: "number", description: "1-based column number." },
      },
      required: ["path", "line", "column"],
      additionalProperties: false,
    }),
    execute: async ({ path: p, line, column }) => {
      try {
        const full = await resolve_in_workspace(p);
        const result = await lsp_request(sender, "definition", {
          path: full,
          line,
          column,
        });
        return { success: true, locations: result };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
  });

  const LspReferencesTool = tool({
    description:
      "Find all references/usages of the symbol at a 1-based line/column. " +
      "Returns a list of { path, line, column } locations from the language server.",
    inputSchema: jsonSchema<{ path: string; line: number; column: number }>({
      type: "object",
      properties: {
        path: { type: "string", description: "File containing the symbol." },
        line: { type: "number", description: "1-based line number." },
        column: { type: "number", description: "1-based column number." },
      },
      required: ["path", "line", "column"],
      additionalProperties: false,
    }),
    execute: async ({ path: p, line, column }) => {
      try {
        const full = await resolve_in_workspace(p);
        const result = await lsp_request(sender, "references", {
          path: full,
          line,
          column,
        });
        return { success: true, locations: result };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
  });

  const LspSymbolsTool = tool({
    description:
      "Get the document outline (symbols: classes, functions, methods, etc.) " +
      "for a file from the language server. Each symbol has a name, kind, line, " +
      "and nesting depth. Use this to understand a file's structure quickly.",
    inputSchema: jsonSchema<{ path: string }>({
      type: "object",
      properties: {
        path: { type: "string", description: "File to outline." },
      },
      required: ["path"],
      additionalProperties: false,
    }),
    execute: async ({ path: p }) => {
      try {
        const full = await resolve_in_workspace(p);
        const result = await lsp_request(sender, "symbols", { path: full });
        return { success: true, symbols: result };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
  });

  return {
    ReadFileTool,
    WriteFileTool,
    EditFileTool,
    ListDirTool,
    CreateDirTool,
    OpenFileTool,
    GotoLineTool,
    GetActiveFileTool,
    GetSelectionTool,
    RunCommandTool,
    ReadTerminalTool,
    LspDiagnosticsTool,
    LspHoverTool,
    LspDefinitionTool,
    LspReferencesTool,
    LspSymbolsTool,
  };
}
