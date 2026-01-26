import { ISettings } from "../../workbench.types";
import { update_settings } from "../store/slice";
import { dispatch } from "../store/store";

const DEFAULT_SETTINGS: ISettings = {
  "editor.fontFamily": "Jetbrains Mono, monospace",
  "editor.fontSize": 14,
  "editor.lineHeight": 0,
  "editor.fontWeight": "normal",
  "editor.tabSize": 2,
  "editor.insertSpaces": true,
  "editor.detectIndentation": true,
  "editor.wordWrap": "off",
  "editor.wordWrapColumn": 80,
  "editor.autoSave": true,
  "editor.autoSaveDelay": 1000,
  "editor.cursorStyle": "line",
  "editor.cursorBlinking": "blink",
  "editor.smoothCaretAnimation": false,
  "appearance.colorTheme": "Dark",
  "appearance.iconTheme": "Default",
  "appearance.uiFontSize": 13,
  "appearance.terminalFontSize": 14,
  "appearance.zoomLevel": 0,
  "terminal.shell.path": "/bin/bash",
  "terminal.shell.args": "",
  "terminal.font.family": "Jetbrains Mono, monospace",
  "terminal.font.size": 14,
  "files.autoSave": true,
  "files.autoSaveAfterDelay": true,
  "files.encoding": "utf8",
  "files.autoGuessEncoding": false,
};

class SettingsManager {
  private settings: ISettings;
  private listeners: Map<keyof ISettings, Set<(value: any) => void>> =
    new Map();

  constructor() {
    this.settings = this.loadSettings();
    this.syncToStore();
  }

  private loadSettings(): ISettings {
    try {
      const stored = localStorage.getItem("workbench.settings");
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error("Failed to load settings:", e);
    }
    return { ...DEFAULT_SETTINGS };
  }

  private saveSettings() {
    try {
      localStorage.setItem("workbench.settings", JSON.stringify(this.settings));
      this.syncToStore();
    } catch (e) {
      console.error("Failed to save settings:", e);
    }
  }

  private syncToStore() {
    dispatch(update_settings(this.settings));
  }

  get<K extends keyof ISettings>(key: K): ISettings[K] {
    return this.settings[key];
  }

  set<K extends keyof ISettings>(key: K, value: ISettings[K]) {
    if (this.settings[key] !== value) {
      this.settings[key] = value;
      this.saveSettings();
      this.notifyListeners(key, value);

      // Emit global event for settings change
      document.dispatchEvent(
        new CustomEvent("settings.changed", {
          detail: { key, value },
        }),
      );
    }
  }

  watch<K extends keyof ISettings>(
    key: K,
    callback: (value: ISettings[K]) => void,
  ): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback as any);

    // Call immediately with current value
    callback(this.settings[key]);

    // Return unsubscribe function
    return () => {
      this.listeners.get(key)?.delete(callback as any);
    };
  }

  private notifyListeners<K extends keyof ISettings>(
    key: K,
    value: ISettings[K],
  ) {
    this.listeners.get(key)?.forEach((callback) => {
      callback(value);
    });
  }

  getAll(): ISettings {
    return { ...this.settings };
  }

  reset() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.saveSettings();

    // Notify all listeners
    Object.keys(this.settings).forEach((key) => {
      this.notifyListeners(
        key as keyof ISettings,
        this.settings[key as keyof ISettings],
      );
    });
  }
}

export const settingsManager = new SettingsManager();
