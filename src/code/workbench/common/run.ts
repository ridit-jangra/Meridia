import { TERMINAL_RUN_COMMAND, TERMINAL_RUN_FILE } from "../../../../shared/ipc/channels";
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
}, 200);
