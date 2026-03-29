import {
  TERMINAL_GET_OUTPUT,
  TERMINAL_OUTPUT_RESPONSE,
  TERMINAL_RUN_COMMAND,
  TERMINAL_RUN_FILE,
} from "../../../../shared/ipc/channels";
import { get_file_extension } from "../../editor/editor.helper";
import { terminal } from "../../platform/terminal/terminal.service";
import {
  enable_node_at_path,
  update_layout,
} from "../browser/layouts/layout.helper";
import { shortcuts } from "./shortcut/shortcut.service";
import { store } from "./state/store";

const program_map: Record<string, string> = {
  py: "python",
  js: "node",
  ts: "ts-node",
  rs: "cargo run",
  go: "go run",
  java: "javac && java",
  kt: "kotlinc && kotlin",
  cpp: "g++ -std=c++17 && ./a.out",
  c: "gcc && ./a.out",
  cs: "dotnet run",
  php: "php",
  rb: "ruby",
  sh: "bash",
  swift: "swift",
  dart: "dart run",
  lua: "lua",
};

export function runCurrentFile() {
  const tabs = store.getState().editor.tabs;
  const active = tabs.find((t) => t.active);
  if (!active) return;

  runFile(active.file_path);
}

export function runFile(file_path: string) {
  const active_terminal = terminal.get_active();
  if (!active_terminal) return;

  update_layout([1, 1], enable_node_at_path);

  const ext = get_file_extension(file_path);
  const program = program_map[ext];
  if (!program) return;

  shortcuts.run_shortcut("editor.save");

  const id = active_terminal.id;
  const script = `${program} ${file_path}\r`;

  window.pty.write(id, script);
}

const STRIP_ANSI = /\x1B(?:[@-Z\\-_]|\[[0-9;]*[ -/]*[@-~])/g;
const _output_buffer: string[] = [];
const MAX_BUFFER = 500;

window.pty.on_data((_, _id, data: string) => {
  const lines = data.replace(STRIP_ANSI, "").replace(/\r\n|\r/g, "\n").split("\n");
  for (const line of lines) {
    if (line.trim()) _output_buffer.push(line);
  }
  if (_output_buffer.length > MAX_BUFFER) {
    _output_buffer.splice(0, _output_buffer.length - MAX_BUFFER);
  }
});

setTimeout(() => {
  const ipc = window.ipc;

  ipc.on(TERMINAL_RUN_FILE, (_, path: string) => {
    runFile(path);
  });

  ipc.on(TERMINAL_RUN_COMMAND, (_, command: string) => {
    const active_terminal = terminal.get_active();
    if (!active_terminal) return;
    update_layout([1, 1], enable_node_at_path);
    window.pty.write(active_terminal.id, `${command}\r`);
  });

  ipc.on(TERMINAL_GET_OUTPUT, (_, lines: number = 50) => {
    const slice = _output_buffer.slice(-lines).join("\n");
    ipc.send(TERMINAL_OUTPUT_RESPONSE, slice);
  });
}, 200);
