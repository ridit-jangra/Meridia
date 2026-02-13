// layout.engine.ts
import { LAYOUT_PRESETS_KEY } from "../shared/storage-keys";
import { layout_preset } from "./presets/preset.types";

export class Engine {
  private presets: Record<string, layout_preset> = {};
  private default_presets: Record<string, layout_preset> = {};

  public register_default_layout(preset: layout_preset) {
    // Deep clone to prevent reference issues
    this.default_presets[preset.id] = JSON.parse(JSON.stringify(preset));
    // Initialize presets with default if not already present
    if (!this.presets[preset.id]) {
      this.presets[preset.id] = JSON.parse(JSON.stringify(preset));
    }
  }

  public get_layout(preset_id: string) {
    return this.presets[preset_id];
  }

  public async update_preset(preset_id: string, new_preset: layout_preset) {
    this.presets[preset_id] = new_preset;
    await this.save();
  }

  async save() {
    await window.storage.set(LAYOUT_PRESETS_KEY, this.presets);
  }

  public async load() {
    try {
      const loaded =
        await window.storage.get<Record<string, layout_preset>>(
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
