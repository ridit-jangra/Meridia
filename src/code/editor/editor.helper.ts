import * as monaco from "monaco-editor";

import { ITab, tab_status } from "../../types/editor.types";
import { shortcut_def } from "../../types/shortcut.types";

import { generate_uri, uris_equal } from "../../../shared/uri/generate";
import { store } from "../workbench/common/state/store";
import { update_tabs } from "../workbench/common/state/slices/editor.slice";
import { get_base_name } from "../platform/explorer/explorer.helper";
import { ContextMenuItem } from "../workbench/browser/parts/components/context-menu";
import { shortcuts } from "../workbench/common/shortcut/shortcut.service";

export function open_editor_tab(file_path: string) {
  const current_tabs = store.getState().editor.tabs;
  const target = current_tabs.find((v) => uris_equal(v.file_path, file_path));

  if (target) {
    const updated_tabs = current_tabs.map((tab) => ({
      ...tab,
      active: uris_equal(tab.file_path, file_path),
    }));

    store.dispatch(update_tabs(updated_tabs));
    return;
  }

  const updated_tabs = current_tabs.map((tab) => ({
    ...tab,
    active: false,
  }));

  const new_tab: ITab = {
    file_path: generate_uri(file_path),
    name: get_base_name(file_path),
    active: true,
    tab_status: "EXISTS",
  };

  store.dispatch(update_tabs([...updated_tabs, new_tab]));
}

export function open_new_editor_tab() {
  const current_tabs = store.getState().editor.tabs;

  const updated_tabs = current_tabs.map((tab) => ({
    ...tab,
    active: false,
  }));

  const new_tab: ITab = {
    file_path: `NEW_${crypto.randomUUID()}.txt`,
    name: "Untitled",
    active: true,
    tab_status: "NEW",
    is_touched: true,
  };

  store.dispatch(update_tabs([...updated_tabs, new_tab]));
}

export function close_active_editor_tab() {
  const tabs = store.getState().editor.tabs;
  const active = tabs.find((t) => t.active);

  if (!active) return;

  close_editor_tab(active.file_path);
}

export function close_editor_tab(file_path: string, force: boolean = false) {
  const tabs = store.getState().editor.tabs;
  const index = tabs.findIndex((t) => uris_equal(t.file_path, file_path));

  if (index === -1) return;

  const active = tabs[index];

  const wasActive = tabs[index].active;
  const nextTabs = tabs.filter((_, i) => i !== index);

  if (nextTabs.length === 0) {
    store.dispatch(update_tabs([]));
    return;
  }

  if (!wasActive) {
    store.dispatch(update_tabs(nextTabs));
    return;
  }

  const nextActiveIndex = Math.max(0, index - 1);

  if (active.is_touched) {
    if (force) {
      const updated = nextTabs.map((t, i) => ({
        ...t,
        active: i === nextActiveIndex,
      }));

      store.dispatch(update_tabs(updated));
    } else {
      if (!confirm(`Are you sure you want to close this tab without saving?`))
        return;
      const updated = nextTabs.map((t, i) => ({
        ...t,
        active: i === nextActiveIndex,
      }));
      store.dispatch(update_tabs(updated));
    }
  } else {
    const updated = nextTabs.map((t, i) => ({
      ...t,
      active: i === nextActiveIndex,
    }));

    store.dispatch(update_tabs(updated));
  }
}

export function close_other_tabs(file_path: string) {
  const current_tabs = store.getState().editor.tabs;
  const keep_tab = current_tabs.find((tab) => tab.file_path === file_path);

  if (!keep_tab) return;

  store.dispatch(update_tabs([{ ...keep_tab, active: true }]));
}

export function close_all_tabs() {
  store.dispatch(update_tabs([]));
}

export function get_file_extension(file_path: string) {
  return file_path.slice(file_path.lastIndexOf(".") + 1);
}

export function path_to_language(file_path: string) {
  const extension = get_file_extension(file_path);

  const language_map: Record<string, string> = {
    ts: "typescript",
    js: "javascript",
    mts: "typescript",
    ets: "typescript",
    ejs: "javascript",
    mjs: "javascript",
    tsx: "typescript",
    jsx: "javascript",
    html: "html",
    py: "python",
    pyi: "python",
    json: "json",
    md: "markdown",
    css: "css",
    xml: "xml",
    yaml: "yaml",
  };

  return language_map[extension] ?? "plaintext";
}

const action_item = (
  editor: monaco.editor.IStandaloneCodeEditor,
  id: string,
  command_id?: string,
): ContextMenuItem | null => {
  const a = editor.getSupportedActions().find((x) => x.id === id);
  if (!a) return null;

  const supported = a.isSupported?.() ?? true;

  return {
    type: "item",
    label: a.label ?? id,
    command_id,
    disabled: !supported,
    onClick: () => a.run(),
  };
};

const submenu = (
  label: string,
  items: (ContextMenuItem | null)[],
  disabled?: boolean,
): ContextMenuItem | null => {
  const filtered = items.filter(Boolean) as ContextMenuItem[];
  if (filtered.length === 0) return null;
  return { type: "submenu", label, items: filtered, disabled };
};

const sep = (): ContextMenuItem => ({ type: "separator" });

export const build_monaco_context_items = (
  editor: monaco.editor.IStandaloneCodeEditor,
): ContextMenuItem[] => {
  const hasSelection = !(editor.getSelection()?.isEmpty() ?? true);

  const editItems: (ContextMenuItem | null)[] = [
    action_item(editor, "editor.action.clipboardCutAction", "Ctrl+X"),
    action_item(editor, "editor.action.clipboardCopyAction", "Ctrl+C"),
    action_item(editor, "editor.action.clipboardPasteAction", "Ctrl+V"),
    sep(),
    action_item(editor, "editor.action.selectAll", "Ctrl+A"),
    action_item(editor, "undo", "Ctrl+Z"),
    action_item(editor, "redo", "Ctrl+Y"),
  ];

  const findItems: (ContextMenuItem | null)[] = [
    action_item(editor, "actions.find", "Ctrl+F"),
    action_item(editor, "editor.action.startFindReplaceAction", "Ctrl+H"),
    action_item(editor, "editor.action.nextMatchFindAction", "F3"),
    action_item(editor, "editor.action.previousMatchFindAction", "Shift+F3"),
  ];

  const goToItems: (ContextMenuItem | null)[] = [
    action_item(editor, "editor.action.revealDefinition", "F12"),
    action_item(editor, "editor.action.goToDeclaration", ""),
    action_item(editor, "editor.action.goToImplementation", "Ctrl+F12"),
    action_item(editor, "editor.action.goToTypeDefinition", ""),
    action_item(editor, "editor.action.goToReferences", "Shift+F12"),
    sep(),
    action_item(editor, "editor.action.peekDefinition", "Alt+F12"),
    action_item(editor, "editor.action.peekDeclaration", ""),
    action_item(editor, "editor.action.peekImplementation", ""),
    action_item(editor, "editor.action.peekTypeDefinition", ""),
    action_item(editor, "editor.action.referenceSearch.trigger", ""),
  ];

  const peekItems: (ContextMenuItem | null)[] = [
    action_item(editor, "editor.action.peekDefinition", "Alt+F12"),
    action_item(editor, "editor.action.peekDeclaration", ""),
    action_item(editor, "editor.action.peekImplementation", ""),
    action_item(editor, "editor.action.peekTypeDefinition", ""),
    action_item(editor, "editor.action.goToReferences", "Shift+F12"),
  ];

  const formatItems: (ContextMenuItem | null)[] = [
    action_item(editor, "editor.action.formatDocument", "Shift+Alt+F"),
    action_item(editor, "editor.action.formatSelection", ""),
    action_item(editor, "editor.action.organizeImports", ""),
  ];

  const commandPaletteKeys = (shortcuts.get_shortcut({
    command: "app.commandPalette",
  })?.keys ?? "Ctrl+Shift+P") as string;

  const customItems: ContextMenuItem[] = [
    {
      type: "item",
      label: "Command Palette",
      command_id: commandPaletteKeys
        .split("+")
        .map((v) => v[0].toUpperCase() + v.slice(1))
        .join("+"),
      disabled: false,
      onClick: () => {
        shortcuts.run_shortcut("commandPalette");
      },
    },
  ];

  const items: (ContextMenuItem | null)[] = [
    ...editItems,
    sep(),

    submenu("Find", findItems),
    submenu("Go to", goToItems),
    submenu("Peek", peekItems),

    sep(),
    submenu("Format", formatItems),

    sep(),
    action_item(editor, "editor.action.commentLine", "Ctrl+/"),
    action_item(editor, "editor.action.blockComment", "Shift+Alt+A"),
    action_item(editor, "editor.action.insertLineAfter", ""),
    action_item(editor, "editor.action.insertLineBefore", ""),

    sep(),
    ...customItems,
  ];

  const cleaned = items.filter(Boolean) as ContextMenuItem[];

  if (!hasSelection) {
    for (const it of cleaned) {
      if (it.type === "item") {
        if (
          it.label.toLowerCase() === "cut" ||
          it.label.toLowerCase() === "copy"
        ) {
          it.disabled = true;
        }
      }
      if (it.type === "submenu") {
        it.items.forEach((sub) => {
          if (sub.type === "item") {
            if (
              sub.label.toLowerCase() === "cut" ||
              sub.label.toLowerCase() === "copy"
            ) {
              sub.disabled = true;
            }
          }
        });
      }
    }
  }

  return cleaned;
};

const is_safe_keybinding = (keys: string) => {
  if (!keys) return false;

  const k = keys.toLowerCase().trim();

  if (
    k.includes("ctrl+") ||
    k.includes("alt+") ||
    k.includes("shift+") ||
    k.includes("meta+")
  )
    return true;

  if (/^f\d{1,2}$/.test(k)) return true;

  if (
    k.startsWith("ctrl+") ||
    k.startsWith("alt+") ||
    k.startsWith("shift+") ||
    k.startsWith("meta+")
  )
    return true;

  return false;
};

const norm = (label: string) => {
  return label
    .replace(/\u21E7/g, "Shift")
    .replace(/\u2325/g, "Alt")
    .replace(/\u2318/g, "Cmd")
    .replace(/\u2303/g, "Ctrl")
    .replace(/\s+/g, "")
    .replace(/Cmd/g, "Meta")
    .replace(/Control/g, "Ctrl")
    .replace(/Command/g, "Meta")
    .replace(/Option/g, "Alt")
    .replace(/Meta/g, "meta")
    .replace(/Ctrl/g, "ctrl")
    .replace(/Shift/g, "shift")
    .replace(/Alt/g, "alt")
    .replace(/ArrowUp/g, "up")
    .replace(/ArrowDown/g, "down")
    .replace(/ArrowLeft/g, "left")
    .replace(/ArrowRight/g, "right")
    .replace(/Enter/g, "enter")
    .replace(/Escape/g, "escape")
    .replace(/Backspace/g, "backspace")
    .replace(/Delete/g, "delete")
    .replace(/Space/g, "space")
    .replace(/Tab/g, "tab")
    .replace(/\+/g, "+")
    .toLowerCase();
};

const get_keys = (
  editor: monaco.editor.IStandaloneCodeEditor,
  commandId: string,
) => {
  const svc = (editor as any)._standaloneKeybindingService;
  if (!svc) return "";

  try {
    const many = svc.lookupKeybindings?.(commandId);
    if (Array.isArray(many) && many.length > 0) {
      const labels = many
        .map((kb: any) => kb?.getLabel?.())
        .filter(Boolean) as string[];

      if (labels.length > 0) return norm(labels[0]).replace(/\s+/g, " ");
    }

    const one = svc.lookupKeybinding?.(commandId);
    const label = one?.getLabel?.();
    if (label) return norm(label).replace(/\s+/g, " ");
  } catch {}

  return "";
};

export function build_monaco_shortcuts(
  editor: monaco.editor.IStandaloneCodeEditor,
): shortcut_def[] {
  const actions = editor.getSupportedActions().filter((a) => a.label);

  return actions.map((a) => {
    const keys_raw = get_keys(editor, a.id);
    const keys = is_safe_keybinding(keys_raw) ? keys_raw : "";

    return {
      id: `editor.${a.id}`,
      label: a.label ?? a.id,
      category: "Editor",
      keys,
      command: `editor.${a.id}`,
      scope: "app",
      prevent_default: false,
    };
  });
}

export function update_editor_tab(old_path: string, new_path: string) {
  const tabs = store.getState().editor.tabs;
  const index = tabs.findIndex((t) => t.file_path === old_path);
  if (index === -1) return;

  const updated = tabs.map((tab) =>
    tab.file_path === old_path
      ? {
          ...tab,
          file_path: new_path,
          name: get_base_name(new_path),
        }
      : tab,
  );

  store.dispatch(update_tabs(updated));
}

export function update_editor_tab_status(path: string, status: tab_status) {
  const tabs = store.getState().editor.tabs;

  const p = norm(path);

  const updated = tabs.map((tab) =>
    uris_equal(norm(tab.file_path), p) ? { ...tab, tab_status: status } : tab,
  );

  store.dispatch(update_tabs(updated));
}

export { monaco };

export function get_monaco_languages() {
  return monaco.languages
    .getLanguages()
    .map((l) => ({
      id: l.id,
      label: l.aliases?.[0] ?? l.id,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function get_monaco_encodings() {
  return [
    { id: "utf8", label: "UTF-8" },
    { id: "utf16le", label: "UTF-16 LE" },
    { id: "utf16be", label: "UTF-16 BE" },
  ];
}

export function get_monaco_indentations() {
  return [2, 4, 8].map((n) => ({
    id: String(n),
    label: `Spaces: ${n}`,
  }));
}
