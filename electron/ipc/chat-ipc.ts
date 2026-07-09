import { ipcMain, type WebContents } from "electron";
import { createClient, buildProvider } from "@ridit/ai/ai";
import { createMemoryTools, ThinkTool } from "@ridit/ai/tools";
import {
  createSession,
  createStore,
  type Session,
  type Store,
} from "@ridit/ai/utils";
import type { ToolSet } from "ai";
import {
  CHAT_PUSH,
  CHAT_TOOL_CALL,
  CHAT_TOOL_RESULT,
  CHAT_AGENT_EVENT,
  EDITOR_ACTIVE_FILE,
  EDITOR_SELECTION,
} from "../../shared/ipc/channels";
import type {
  IChatContext,
  IChatResult,
  AgentEvent,
} from "../../shared/types/chat.types";
import { create_tools, SUBAGENT_TOOL_KEYS } from "../ai/tools";
import { set_session_auto_approve } from "../ai/permissions";
import { workspace } from "../main-services/workspace-service";
import { storage } from "../main-services/storage-service";
import { SETTINGS_KEY } from "../../shared/storage-keys";
import fs from "fs";
import path from "path";
import { app } from "electron";

interface AiSettings {
  ai_provider: string;
  ai_api_key: string;
  ai_model: string;
}

// AI provider config is stored in settings (Settings -> AI), no longer .env.
function get_ai_settings(): AiSettings {
  const s = storage.get<Partial<AiSettings>>(SETTINGS_KEY, {});
  return {
    ai_provider: s.ai_provider || "openrouter",
    ai_api_key: s.ai_api_key || "",
    ai_model: s.ai_model || "deepseek/deepseek-v4-flash",
  };
}

const SUBAGENT_SYSTEM = `You are a focused sub-agent spawned by the main coding agent to do one self-contained job — usually exploration or research across the workspace.

You have READ-ONLY tools (read files, list directories, language-server queries). You cannot edit files or run commands.

Work efficiently, then STOP and reply with a concise report of your findings: the concrete answer, the relevant file paths and line numbers, and anything the main agent needs to act. Do not pad the report — it is the only thing returned to the caller.`;

function subagent_step_preview(input: unknown): string {
  const i = (input ?? {}) as Record<string, unknown>;
  const raw = String(
    i.path ?? i.command ?? i.query ?? i.pattern ?? i.line ?? "",
  );
  return raw.split(/[\\/]/).pop() ?? raw;
}

// Runs a delegated sub-agent with a fresh context + read-only tools, streaming
// its steps to the renderer, and resolves with the sub-agent's final report.
async function run_subagent(opts: {
  sender: WebContents;
  ai: AiSettings;
  task: string;
  agent_id: string;
  get_active_file: () => string | null;
  get_selection: () => string | null;
}): Promise<string> {
  const { sender, ai, task, agent_id } = opts;

  const all = create_tools({
    sender,
    session_id: `sub:${agent_id}`,
    get_active_file: opts.get_active_file,
    get_selection: opts.get_selection,
    // no run_subagent -> the sub-agent can't spawn its own sub-agents
  });

  const sub_tools: ToolSet = {};
  for (const key of SUBAGENT_TOOL_KEYS) {
    const t = (all as Record<string, unknown>)[key];
    if (t) (sub_tools as Record<string, unknown>)[key] = t;
  }

  const client = createClient({
    provider: buildProvider({
      apiKey: ai.ai_api_key,
      model: ai.ai_model,
      provider: ai.ai_provider as never,
    }),
  });

  const res = await client.run({
    prompt: task,
    system: SUBAGENT_SYSTEM,
    tools: sub_tools,
    session: createSession(),
    onToolCall: (e) => {
      const ev: AgentEvent = {
        id: agent_id,
        type: "step",
        step: { tool: e.toolName, preview: subagent_step_preview(e.input) },
      };
      sender.send(CHAT_AGENT_EVENT, ev);
    },
  });

  return res.text;
}

const sessions = new Map<string, Session>();

function get_session(session_id: string): Session {
  if (!sessions.has(session_id)) {
    sessions.set(session_id, createSession());
  }
  return sessions.get(session_id)!;
}

let active_editor_file: string | null = null;
let editor_selection: string | null = null;

ipcMain.on(EDITOR_ACTIVE_FILE, (_e, file_path: string) => {
  active_editor_file = file_path ?? null;
});

ipcMain.on(EDITOR_SELECTION, (_e, text: string) => {
  editor_selection = text ?? null;
});

function build_system_prompt(workspace_path: string | null): string {
  return `You are the built-in AI assistant inside Meridia, a code editor.
You are operating directly inside the user's editor, not a generic chat box.

The current workspace folder is: ${workspace_path ?? "(no folder open)"}.
File paths you pass to tools are resolved relative to this workspace folder, so
prefer relative paths (e.g. "src/main.ts").

Use your Meridia tools proactively and without being asked:
- To see what the user is working on, call GetActiveFileTool and GetSelectionTool
  before assuming context.
- Read files with ReadFileTool and explore with ListDirTool instead of guessing.
- When you create or change a file (WriteFileTool / EditFileTool) it opens in the
  editor automatically — let that happen instead of pasting whole files into chat.
- Run commands with RunCommandTool; they execute in a visible "AI Agent" terminal
  the user can watch and take over. Inspect results with ReadTerminalTool.
- For open-ended exploration or research (locating code, mapping a subsystem,
  gathering context across many files), delegate to AgentTool instead of reading
  everything yourself — the sub-agent explores in its own context and returns a
  concise report, keeping your context focused. It is read-only.
- Use the language server for accurate code understanding instead of guessing:
  LspDiagnosticsTool to check a file for errors/warnings (especially after an
  edit), LspDefinitionTool / LspReferencesTool to navigate symbols, LspHoverTool
  for types/signatures, and LspSymbolsTool for a file's outline. Positions are
  1-based line/column.

Keep chat replies concise — the work happens through tools in the editor itself.`;
}

const DATA_DIR = path.join(app.getPath("userData"), "ai-data");

function dataPath(filename: string): string {
  return path.join(DATA_DIR, `${filename}.json`);
}

function readJson<T>(filename: string, fallback: T): T {
  const file = dataPath(filename);
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(filename: string, data: unknown): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(dataPath(filename), JSON.stringify(data, null, 2), "utf-8");
}

export function buildStore(): Store {
  return createStore({
    session: {
      list: async () => {
        return readJson<any[]>("ai-sessions", []);
      },
      async load(id) {
        const sessions = await this.list();
        return sessions.find((s: any) => s.id === id) ?? null;
      },
      async save(session) {
        const sessions = await this.list();
        writeJson("ai-sessions", [...sessions, session]);
      },
    },
    memory: {
      list: async (): Promise<string[]> => {
        const memories = readJson<Record<string, string>>("ai-memory", {});
        return Object.keys(memories);
      },
      async read(name: string): Promise<string | null> {
        const memories = readJson<Record<string, string>>("ai-memory", {});
        return memories[name] ?? null;
      },
      async write(name: string, content: string): Promise<void> {
        const memories = readJson<Record<string, string>>("ai-memory", {});
        memories[name] = content;
        writeJson("ai-memory", memories);
      },
    },
  });
}

ipcMain.handle(
  CHAT_PUSH,
  async (
    event,
    session_id: string,
    message: string,
    context?: IChatContext,
  ): Promise<IChatResult> => {
    const sender = event.sender;
    const session = get_session(session_id);

    // "Allow edits" toggle in the composer grants blanket approval for the session.
    set_session_auto_approve(session_id, !!context?.allowEdits);

    const store = buildStore();

    const { MemoryEditTool, MemoryListTool, MemoryReadTool, MemoryWriteTool } =
      createMemoryTools(store);

    const workspace_path = await workspace.get_current_workspace_path();

    const ai = get_ai_settings();

    const meridia_tools = create_tools({
      sender,
      session_id,
      get_active_file: () => active_editor_file,
      get_selection: () => editor_selection,
      run_subagent: ({ task, agent_id }) =>
        run_subagent({
          sender,
          ai,
          task,
          agent_id,
          get_active_file: () => active_editor_file,
          get_selection: () => editor_selection,
        }),
    });
    if (!ai.ai_api_key) {
      return {
        error: `No API key set. Add your ${ai.ai_provider} API key in Settings → AI.`,
        message: "",
        tools: [],
        permissionRequired: [],
        model: ai.ai_model,
      };
    }

    const client = createClient({
      provider: buildProvider({
        apiKey: ai.ai_api_key,
        model: ai.ai_model,
        provider: ai.ai_provider as never,
      }),
    });

    try {
      const resultString = await client.run({
        prompt: message,
        system: build_system_prompt(workspace_path),
        tools: {
          MemoryEditTool,
          MemoryListTool,
          MemoryReadTool,
          MemoryWriteTool,
          ThinkTool,
          ...meridia_tools,
        },
        store,
        onToolCall: (e) => {
          console.log("[ipc] raw tool_call event:", JSON.stringify(e));
          sender.send(CHAT_TOOL_CALL, {
            id: e.id,
            tool: e.toolName,
            args: e.input,
          });
        },
        onToolResult: (e) => {
          console.log("[ipc] raw tool_result event:", JSON.stringify(e));
          sender.send(CHAT_TOOL_RESULT, {
            id: e.id,
            tool: e.toolName,
            result: e.output,
          });
        },
        session,
      });

      return {
        message: resultString.text,
        tools: [],
        permissionRequired: [],
        model: ai.ai_model,
        error: undefined,
      };
    } catch (e) {
      return {
        error: e instanceof Error ? e.message : String(e),
        message: "",
        tools: [],
        permissionRequired: [],
        model: ai.ai_model,
      };
    }
  },
);
