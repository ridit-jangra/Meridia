import { layout_engine } from "../layouts/layout.engine";
import { debounce } from "../shortcut/shortcut.init";
import { store } from "../store/store";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const update_layout = (
  pathToNode: ("a" | "b")[],
  updateFn: (root: any, path: ("a" | "b")[]) => any
) => {
  debounce(() => {
    const state = store.getState();
    const active_layout_id = state.layout.active_layout_id;
    const preset = layout_engine.get_layout(active_layout_id);

    if (!preset) return;

    const new_root = updateFn(preset.root, pathToNode);

    layout_engine.update_preset(active_layout_id, {
      ...preset,
      root: new_root,
    });
  });
};
