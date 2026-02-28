export type shortcut_scope = "app" | "editor" | "terminal";

export type shortcut_ctx = Record<string, boolean>;

export type shortcut_def = {
  id: string;
  keys: string | string[];
  command: string;
  scope?: shortcut_scope;
  when?: string;
  prevent_default?: boolean;
  category?: string;
  label?: string;
};

export type command_handler = (e: KeyboardEvent) => void;

export type command_def = {
  id: string;
  run: command_handler;
};
