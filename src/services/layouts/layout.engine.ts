import { LAYOUT_PRESETS_KEY } from "../../../shared/storage-keys";
import { TLayoutPreset } from "./presets/preset.types";

const clone = <T>(v: T): T => {
  if (typeof structuredClone === "function") return structuredClone(v);
  return JSON.parse(JSON.stringify(v));
};

export class Engine {
  private presets: Record<string, TLayoutPreset> = {};
  private default_presets: Record<string, TLayoutPreset> = {};
  private listeners: Set<() => void> = new Set();
  private save_timer: number | null = null;

  public get_all_presets() {
    return this.presets;
  }

  public register_default_layout(preset: TLayoutPreset) {
    this.default_presets[preset.id] = clone(preset);

    if (!this.presets[preset.id]) {
      this.presets[preset.id] = clone(preset);
      this.notify();
      this.schedule_save();
    }

    return this.presets[preset.id];
  }

  public get_layout(preset_id: string) {
    return this.presets[preset_id];
  }

  public update_preset(preset_id: string, new_preset: TLayoutPreset) {
    this.presets[preset_id] = new_preset;
    this.notify();
    this.schedule_save();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  private schedule_save(delay = 450) {
    if (this.save_timer) window.clearTimeout(this.save_timer);
    this.save_timer = window.setTimeout(() => {
      this.save_timer = null;
      this.save();
    }, delay);
  }

  public async save() {
    await window.storage.set(LAYOUT_PRESETS_KEY, this.presets);
  }

  public async load() {
    try {
      const loaded =
        await window.storage.get<Record<string, TLayoutPreset>>(
          LAYOUT_PRESETS_KEY,
        );

      if (loaded) this.presets = loaded;
      this.notify();
    } catch (e) {
      console.error("Failed to load presets:", e);
      this.presets = {};
      this.notify();
    }
  }

  public reset_preset(preset_id: string) {
    const d = this.default_presets[preset_id];
    if (!d) return;
    this.presets[preset_id] = clone(d);
    this.notify();
    this.schedule_save();
  }

  public reset_all() {
    this.presets = clone(this.default_presets);
    this.notify();
    this.schedule_save();
  }
}

export const layout_engine = new Engine();
