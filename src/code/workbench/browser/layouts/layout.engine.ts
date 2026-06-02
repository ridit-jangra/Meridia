
import { LAYOUT_PRESETS_KEY } from "../../../../../shared/storage-keys";
import { TLayoutPreset } from "../../../../types/preset.types";

const clone = <T>(v: T): T => {
  if (typeof structuredClone === "function") return structuredClone(v);
  return JSON.parse(JSON.stringify(v));
};

// Compares the structural skeleton of two layout nodes (node type, id, and
// children arity) while ignoring user-mutable fields (sizes, enabled, active
// tab, panel/tab lists). This lets a persisted layout keep the user's resizes
// and toggles, but rejects anything whose structure has drifted from the
// current default (e.g. a panel added/removed across an app update) so it can
// fall back to the default instead of rendering broken.
const same_shape = (a: any, b: any): boolean => {
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  if (a.type !== b.type) return false;
  if ((a.id ?? null) !== (b.id ?? null)) return false;

  const ac = Array.isArray(a.children) ? a.children : null;
  const bc = Array.isArray(b.children) ? b.children : null;
  if (!!ac !== !!bc) return false;
  if (ac && bc) {
    if (ac.length !== bc.length) return false;
    for (let i = 0; i < bc.length; i++) {
      if (!same_shape(ac[i], bc[i])) return false;
    }
  }
  return true;
};

const is_valid_preset = (
  saved: TLayoutPreset | undefined,
  def: TLayoutPreset,
): saved is TLayoutPreset => {
  if (!saved || typeof saved !== "object") return false;
  if (saved.id !== def.id) return false;
  if (!saved.root || typeof saved.root !== "object") return false;
  return same_shape(saved.root, def.root);
};

export class Engine {
  private presets: Record<string, TLayoutPreset> = {};
  private default_presets: Record<string, TLayoutPreset> = {};
  private persisted: Record<string, TLayoutPreset> | null = null;
  private listeners: Set<() => void> = new Set();
  private save_timer: number | null = null;

  public get_all_presets() {
    return this.presets;
  }

  public register_default_layout(preset: TLayoutPreset) {
    this.default_presets[preset.id] = clone(preset);

    if (!this.presets[preset.id]) {
      const saved = this.persisted?.[preset.id];
      // Use the persisted layout only if it still matches the default's
      // structure; otherwise fall back to the default (and re-save it below to
      // heal the stored copy).
      this.presets[preset.id] = is_valid_preset(saved, preset)
        ? clone(saved)
        : clone(preset);
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
