import {
  command_def,
  shortcut_ctx,
  shortcut_def,
  shortcut_scope,
} from "../../../../types/shortcut.types";
import { eval_when } from "./shortcut.when";
import { event_combo, normalize_chord } from "./shortcut.parse";

type match = shortcut_def & { _norm: string };

const is_editable_target = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  if (!el) return false;
  const tag = (el.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  return el.isContentEditable === true;
};

export class shortcut_service {
  private shortcuts: match[] = [];
  private commands: Record<string, (e: KeyboardEvent) => void> = {};
  private ctx: shortcut_ctx = {};
  private scope: shortcut_scope = "app";
  private chord: string[] = [];
  private chord_timer: number | null = null;
  private chord_timeout_ms = 900;

  register_command(cmd: command_def) {
    this.commands[cmd.id] = cmd.run;
  }

  run_shortcut(command: string, e?: KeyboardEvent) {
    const run = this.commands[command];
    if (!run) return false;

    const candidates = this.shortcuts
      .filter((s) => s.command === command)
      .filter(
        (s) =>
          (s.scope ?? "app") === this.scope || (s.scope ?? "app") === "app",
      )
      .filter((s) => eval_when(s.when, this.ctx));

    if (candidates.length === 0) return false;

    if (e) {
      const active = candidates[0];
      if (active.prevent_default ?? true) e.preventDefault();
      run(e);
      return true;
    }

    run(new KeyboardEvent("keydown"));
    return true;
  }

  register_shortcuts(defs: shortcut_def[]) {
    for (const d of defs) this.add_shortcut(d);
  }

  add_shortcut(def: shortcut_def) {
    const keysArray = Array.isArray(def.keys) ? def.keys : [def.keys];

    for (const key of keysArray) {
      this.shortcuts.push({
        ...def,
        keys: key,
        _norm: normalize_chord(key),
      });
    }
  }

  set_ctx(next: shortcut_ctx) {
    this.ctx = next;
  }

  patch_ctx(p: shortcut_ctx) {
    this.ctx = { ...this.ctx, ...p };
  }

  set_scope(scope: shortcut_scope) {
    this.scope = scope;
  }

  bind(target: Window | Document = window) {
    const handler = (e: any) => this.on_keydown(e);
    target.addEventListener("keydown", handler, { capture: true });
    return () =>
      target.removeEventListener(
        "keydown",
        handler as any,
        { capture: true } as any,
      );
  }

  private on_keydown(e: KeyboardEvent) {
    if (is_editable_target(e.target) && this.scope === "app") return;

    const combo = event_combo(e);
    this.chord.push(combo);

    if (this.chord_timer) window.clearTimeout(this.chord_timer);
    this.chord_timer = window.setTimeout(
      () => (this.chord = []),
      this.chord_timeout_ms,
    );

    const chord_str = this.chord.join(" ");
    const candidates = this.shortcuts
      .filter(
        (s) =>
          (s.scope ?? "app") === this.scope || (s.scope ?? "app") === "app",
      )
      .filter((s) => eval_when(s.when, this.ctx));

    const exact = candidates.find((s) => s._norm === chord_str);
    if (exact) {
      if (exact.prevent_default ?? true) e.preventDefault();
      this.chord = [];
      const run = this.commands[exact.command];
      if (run) run(e);
      return;
    }

    const prefix = candidates.some((s) => s._norm.startsWith(chord_str + " "));
    if (!prefix) this.chord = [];
  }

  get_shortcut(opts: {
    id?: string;
    command?: string;
    scope?: shortcut_scope;
    include_global?: boolean;
  }) {
    if (!opts.id && !opts.command) return null;

    const include_global = opts.include_global ?? true;

    const found = this.shortcuts.find((s) => {
      if (opts.id && s.id !== opts.id) return false;
      if (opts.command && s.command !== opts.command) return false;

      if (opts.scope) {
        const scope = s.scope ?? "app";
        if (include_global) {
          if (scope !== opts.scope && scope !== "app") return false;
        } else {
          if (scope !== opts.scope) return false;
        }
      }

      return true;
    });

    if (!found) return null;

    const { _norm, ...rest } = found;
    return { ...rest, norm: _norm };
  }

  get_all_shortcuts() {
    return this.shortcuts;
  }

  list_categories(opts?: { include_uncategorized?: boolean }) {
    const include_uncategorized = opts?.include_uncategorized ?? true;

    const set = new Set<string>();

    for (const s of this.shortcuts) {
      const c = (s.category ?? "").trim();
      if (c) set.add(c);
      else if (include_uncategorized) set.add("Other");
    }

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  get_shortcuts_by_category(
    category: string,
    opts?: { scope?: shortcut_scope; include_global?: boolean },
  ) {
    const include_global = opts?.include_global ?? true;

    return this.shortcuts
      .filter((s) => {
        const c = (s.category ?? "").trim();
        if (!c) return category === "Other";
        return c === category;
      })
      .filter((s) => {
        if (!opts?.scope) return true;
        const scope = s.scope ?? "app";
        if (include_global) return scope === opts.scope || scope === "app";
        return scope === opts.scope;
      })
      .map(({ _norm, ...rest }) => ({ ...rest, norm: _norm }));
  }
}

export const shortcuts = new shortcut_service();
