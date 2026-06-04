import { SETTINGS_KEY } from "../../../../shared/storage-keys";

export interface ISettings {
  editor_font_size: number;
  editor_font_family: string;
  editor_tab_size: number;
  editor_word_wrap: boolean;
  editor_minimap: boolean;
  editor_line_numbers: boolean;
  editor_smooth_scrolling: boolean;
  editor_cursor_blinking: string;
  editor_ligatures: boolean;

  ui_sidebar_position: "left" | "right";
  ui_compact_tabs: boolean;
  ui_show_breadcrumbs: boolean;

  lsp_auto_install: boolean;

  lsp_pylsp: boolean | "Installed" | "Not Installed";
  "lsp_typescript-language-server": boolean | "Installed" | "Not Installed";
  "lsp_rust-analyzer": boolean | "Installed" | "Not Installed";
  lsp_golsp: boolean | "Installed" | "Not Installed";
}

export const DEFAULT_SETTINGS: ISettings = {
  editor_font_size: 15,
  editor_font_family: "JetBrains Mono, monospace",
  editor_tab_size: 2,
  editor_word_wrap: false,
  editor_minimap: false,
  editor_line_numbers: true,
  editor_smooth_scrolling: true,
  editor_cursor_blinking: "expand",
  editor_ligatures: true,
  ui_sidebar_position: "left",
  ui_compact_tabs: false,
  ui_show_breadcrumbs: true,
  lsp_auto_install: true,
  lsp_pylsp: "Not Installed",
  "lsp_typescript-language-server": "Not Installed",
  "lsp_rust-analyzer": "Not Installed",
  lsp_golsp: "Not Installed",
};

type settings_listener = (settings: ISettings) => void;

function merge_settings(
  base: ISettings,
  patch: Partial<ISettings> | null,
): ISettings {
  const out: ISettings = { ...base };
  if (!patch || typeof patch !== "object") return out;

  for (const key of Object.keys(base) as (keyof ISettings)[]) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined || value === null) continue;
    if (typeof value !== typeof base[key]) continue;
    (out as unknown as Record<string, unknown>)[key] = value;
  }
  return out;
}

export class SettingsService {
  private settings: ISettings = { ...DEFAULT_SETTINGS };
  private listeners = new Set<settings_listener>();
  private loaded = false;

  public async load(): Promise<ISettings> {
    try {
      const stored = await window.storage.get<Partial<ISettings>>(SETTINGS_KEY);
      this.settings = merge_settings(DEFAULT_SETTINGS, stored ?? null);
    } catch {
      this.settings = { ...DEFAULT_SETTINGS };
    }
    this.loaded = true;
    this.notify();
    return this.settings;
  }

  public get(): ISettings {
    return this.settings;
  }

  public is_loaded(): boolean {
    return this.loaded;
  }

  public async save(partial: Partial<ISettings>): Promise<void> {
    this.settings = merge_settings(this.settings, partial);
    this.notify();
    await window.storage.set(SETTINGS_KEY, this.settings);
  }

  public async reset(): Promise<void> {
    this.settings = { ...DEFAULT_SETTINGS };
    this.notify();
    await window.storage.set(SETTINGS_KEY, this.settings);
  }

  public subscribe(listener: settings_listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this.settings);
  }
}

export const settings_service = new SettingsService();
