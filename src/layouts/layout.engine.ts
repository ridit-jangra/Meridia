import { LAYOUT_PRESETS_KEY } from "../../shared/storage-keys";
import { TLayoutPreset } from "./presets/preset.types";

export class Engine {
  private presets: Record<string, TLayoutPreset> = {};
  private default_presets: Record<string, TLayoutPreset> = {};

  public register_default_layout(preset: TLayoutPreset) {
    this.default_presets[preset.id] = JSON.parse(JSON.stringify(preset));

    if (!this.presets[preset.id]) {
      this.presets[preset.id] = JSON.parse(JSON.stringify(preset));
    }
  }

  public get_layout(preset_id: string) {
    return this.presets[preset_id];
  }

  public async update_preset(preset_id: string, new_preset: TLayoutPreset) {
    this.presets[preset_id] = new_preset;
    await this.save();
  }

  async save() {
    await window.storage.set(LAYOUT_PRESETS_KEY, this.presets);
  }

  public async load() {
    try {
      const loaded = await window.storage.get<Record<string, TLayoutPreset>>(
        LAYOUT_PRESETS_KEY,
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
        JSON.stringify(this.default_presets[preset_id]),
      );
      await this.save();
    }
  }

  public async reset_all() {
    this.presets = JSON.parse(JSON.stringify(this.default_presets));
    await this.save();
  }
}

export const layout_engine = new Engine();
