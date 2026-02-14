import { LAYOUT_PRESETS_KEY } from "../../shared/storage-keys";
import { TLayoutPreset } from "./presets/preset.types";
import { store } from "../store/store";
import { update_preset as update_preset_action } from "../store/slices/layout.slice";

export class Engine {
  private presets: Record<string, TLayoutPreset> = {};
  private default_presets: Record<string, TLayoutPreset> = {};
  private listeners: Set<() => void> = new Set();

  public get_all_presets() {
    return this.presets;
  }

  public register_default_layout(preset: TLayoutPreset) {
    this.default_presets[preset.id] = JSON.parse(JSON.stringify(preset));

    if (!this.presets[preset.id]) {
      this.presets[preset.id] = JSON.parse(JSON.stringify(preset));
    }

    return this.presets[preset.id];
  }

  public get_layout(preset_id: string) {
    return this.presets[preset_id];
  }

  public async update_preset(preset_id: string, new_preset: TLayoutPreset) {
    this.presets[preset_id] = new_preset;

    store.dispatch(update_preset_action(new_preset));

    this.notify();

    await this.save();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  async save() {
    await window.storage.set(LAYOUT_PRESETS_KEY, this.presets);
  }

  public async load() {
    try {
      const loaded = await window.storage.get<Record<string, TLayoutPreset>>(
        LAYOUT_PRESETS_KEY
      );

      if (loaded) {
        this.presets = loaded;
      }
    } catch (error) {
      console.error("Failed to load presets:", error);
      this.presets = {};
    }
  }

  public async reset_preset(preset_id: string) {
    if (this.default_presets[preset_id]) {
      this.presets[preset_id] = JSON.parse(
        JSON.stringify(this.default_presets[preset_id])
      );

      store.dispatch(update_preset_action(this.presets[preset_id]));

      this.notify();

      await this.save();
    }
  }

  public async reset_all() {
    this.presets = JSON.parse(JSON.stringify(this.default_presets));

    Object.values(this.presets).forEach((preset) => {
      store.dispatch(update_preset_action(preset));
    });

    this.notify();

    await this.save();
  }
}

export const layout_engine = new Engine();
