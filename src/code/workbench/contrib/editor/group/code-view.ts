import { IMonacoModel, tab_status } from "../../../../../types/editor.types";
import {
  monaco,
  path_to_language,
  build_monaco_context_items,
} from "../../../../editor/editor.helper";
import { explorer } from "../../../../platform/explorer/explorer.service";
import { store } from "../../../common/state/store";
import {
  rename_tab,
  set_active_group,
  set_tab_touched,
} from "../../../common/state/slices/editor.slice";
import { h } from "../../core/dom/h";
import { ContextMenu } from "../../../browser/parts/components/context-menu";
import { statusbar_events } from "../../../../platform/events/statusbar.events";
import {
  settings_service,
  ISettings,
} from "../../../../platform/settings/settings.service";
import { on_file_opened } from "../../../browser/lsp";
import { EDITOR_SELECTION } from "../../../../../../shared/ipc/channels";
import { setup_html_auto_close } from "../../../../editor/languages/html";
import { setup_react_auto_close } from "../../../../editor/languages/react";

type Disposer = () => void;

const model_registry = new Map<string, IMonacoModel>();

async function get_or_create_model(uri: string): Promise<IMonacoModel> {
  const cached = model_registry.get(uri);
  if (cached) return cached;

  const muri = monaco.Uri.file(uri);
  const content = (await window.files.exists(uri))
    ? await explorer.actions.read_file(uri)
    : "";

  const existing = monaco.editor.getModel(muri);
  const model =
    existing ?? monaco.editor.createModel(content, path_to_language(uri), muri);
  if (existing && existing.getValue() !== content) existing.setValue(content);

  const entry: IMonacoModel = {
    uri,
    model,
    dispose: () => model.dispose(),
    cursor_position: { line: 1, col: 1 },
  };

  model.onDidChangeContent(() => {
    const groups = store.getState().editor.groups;
    const any_untouched = groups.some((g) =>
      g.tabs.some((t) => t.file_path === uri && !t.is_touched),
    );
    if (any_untouched)
      store.dispatch(set_tab_touched({ file_path: uri, touched: true }));
  });

  model_registry.set(uri, entry);
  return entry;
}

export function get_shared_model(uri: string): IMonacoModel | undefined {
  return model_registry.get(uri);
}

export function rename_open_file(old_uri: string, new_uri: string): void {
  store.dispatch(rename_tab({ old_path: old_uri, new_path: new_uri }));
  const entry = model_registry.get(old_uri);
  if (entry) {
    model_registry.delete(old_uri);
    setTimeout(() => entry.model.dispose(), 0);
  }
}

const EDITOR_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions = {
  language: "plaintext",
  theme: "theme",
  fontFamily: "JetBrains Mono, monospace",
  selectionHighlight: true,
  renderLineHighlight: "all",
  automaticLayout: true,
  minimap: { enabled: false },
  fontSize: 15,
  folding: true,
  cursorSmoothCaretAnimation: "off",
  cursorBlinking: "expand",
  fixedOverflowWidgets: true,
  largeFileOptimizations: true,
  quickSuggestions: true,
  suggestOnTriggerCharacters: true,
  parameterHints: { enabled: true },
  codeLens: true,
  codeLensFontFamily: "JetBrains Mono",
  fontLigatures: true,
  bracketPairColorization: { enabled: true },
  wordBasedSuggestions: "off",
  contextmenu: false,
  smoothScrolling: true,
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export class CodeGroupView {
  readonly el: HTMLElement;
  readonly instance: monaco.editor.IStandaloneCodeEditor;
  active_model: IMonacoModel | null = null;

  private current_uri: string | null = null;
  private view_states = new Map<
    string,
    monaco.editor.ICodeEditorViewState | null
  >();
  private disposers: Disposer[] = [];
  private ctx_menu = ContextMenu();

  constructor(public readonly group_id: string) {
    this.el = h("div", {
      class:
        "monaco-host monaco-editor relative h-full w-full min-h-0 overflow-hidden [&_span]:font-normal [&_a]:text-link-foreground [&_a]:hover:underline",
    });

    this.instance = monaco.editor.create(this.el, { ...EDITOR_OPTIONS });
    setup_html_auto_close(this.instance);
    setup_react_auto_close(this.instance);
    this.apply_settings(settings_service.get());

    const off_settings = settings_service.subscribe((s) =>
      this.apply_settings(s),
    );
    this.disposers.push(off_settings);

    this.el.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.ctx_menu.openAt(
        e.clientX,
        e.clientY,
        build_monaco_context_items(this.instance),
      );
    });

    const d_focus = this.instance.onDidFocusEditorText(() => {
      if (store.getState().editor.active_group_id !== this.group_id)
        store.dispatch(set_active_group(this.group_id));
    });

    const d_cursor = this.instance.onDidChangeCursorPosition((e) => {
      if (!this.is_active()) return;
      statusbar_events.emit(
        "updateLineCol",
        e.position.lineNumber,
        e.position.column,
      );
    });

    const d_model = this.instance.onDidChangeModel(() => {
      if (this.is_active()) this.emit_statusbar();
    });

    const d_sel = this.instance.onDidChangeCursorSelection(() => {
      if (!this.is_active()) return;
      const model = this.instance.getModel();
      const sel = this.instance.getSelection();
      if (!model || !sel || sel.isEmpty()) return;
      const text = model.getValueInRange(sel);
      if (text) window.ipc.send(EDITOR_SELECTION, text);
    });

    this.disposers.push(
      () => d_focus.dispose(),
      () => d_cursor.dispose(),
      () => d_model.dispose(),
      () => d_sel.dispose(),
    );
  }

  private is_active(): boolean {
    return store.getState().editor.active_group_id === this.group_id;
  }

  /**
   * Run the registered document formatter (Prettier via IPC, or the LSP
   * provider) against the current model and wait for the edits to apply.
   * No-ops when no provider matches the language.
   */
  async format_document(): Promise<void> {
    const action = this.instance.getAction("editor.action.formatDocument");
    if (!action) return;
    try {
      await action.run();
    } catch {
      // Formatting is best-effort; never block a save on it.
    }
  }

  private apply_settings(s: ISettings): void {
    this.instance.updateOptions({
      fontSize: s.editor_font_size,
      fontFamily: s.editor_font_family,
      wordWrap: s.editor_word_wrap ? "on" : "off",
      minimap: { enabled: s.editor_minimap },
      lineNumbers: s.editor_line_numbers ? "on" : "off",
      smoothScrolling: s.editor_smooth_scrolling,
      cursorBlinking: s.editor_cursor_blinking as
        | "blink"
        | "smooth"
        | "phase"
        | "expand"
        | "solid",
      fontLigatures: s.editor_ligatures,
    });
    this.instance.getModel()?.updateOptions({ tabSize: s.editor_tab_size });
  }

  emit_statusbar(): void {
    const model = this.instance.getModel();
    if (!model) {
      statusbar_events.emit("updateLineCol", null, null);
      statusbar_events.emit("updateLanguage", null);
      statusbar_events.emit("updateEncoding", null);
      statusbar_events.emit("updateIndentation", null);
      return;
    }
    const pos = this.instance.getPosition();
    statusbar_events.emit(
      "updateLineCol",
      pos?.lineNumber ?? 1,
      pos?.column ?? 1,
    );
    const lang = monaco.languages
      .getLanguages()
      .find((l) => l.id === model.getLanguageId());
    statusbar_events.emit(
      "updateLanguage",
      lang?.aliases?.[0] ?? capitalize(model.getLanguageId()),
    );
    statusbar_events.emit("updateEncoding", "UTF-8");
    statusbar_events.emit("updateIndentation", model.getOptions().tabSize ?? 2);
  }

  async open(uri: string, _status?: tab_status): Promise<void> {
    on_file_opened(uri).catch(() => {});

    if (this.current_uri && this.current_uri !== uri) {
      this.view_states.set(this.current_uri, this.instance.saveViewState());
    }

    const model = await get_or_create_model(uri);
    this.active_model = model;
    this.instance.setModel(model.model);
    model.model.updateOptions({
      tabSize: settings_service.get().editor_tab_size,
    });

    const vs = this.view_states.get(uri);
    if (vs) this.instance.restoreViewState(vs);

    this.current_uri = uri;
    if (this.is_active()) {
      this.emit_statusbar();
      this.instance.focus();
    }
  }

  clear(): void {
    if (this.current_uri)
      this.view_states.set(this.current_uri, this.instance.saveViewState());
    this.instance.setModel(null);
    this.active_model = null;
    this.current_uri = null;
  }

  layout(): void {
    this.instance.layout();
  }

  focus(): void {
    this.instance.focus();
  }

  dispose(): void {
    this.disposers.forEach((d) => d());
    this.disposers = [];
    this.ctx_menu.destroy();
    this.instance.dispose();
    this.el.remove();
  }
}
