import { layout_preset } from "./presets/presets.type";

export class Engine {
  private presets: Record<string, layout_preset> = {};

  public store(preset: layout_preset): void {
    this.presets[preset.id] = preset;
  }

  public load(preset_id: string): layout_preset {
    return this.presets[preset_id];
  }
}

export const layout_engine = new Engine();
