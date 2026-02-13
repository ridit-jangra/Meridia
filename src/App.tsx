import { useEffect, useState } from "react";
import { layout_engine } from "./layouts/layout.engine";
import { LayoutRenderer } from "./layouts/layout.renderer";
import { layout_preset } from "./layouts/presets/preset.types";
import { ide_preset } from "./layouts/presets/preset.ide";
import { ai_focus_preset } from "./layouts/presets/ai-focus.preset";
import { SELECTED_LAYOUT_KEY } from "./shared/storage-keys";

function App() {
  const [preset, setPreset] = useState<layout_preset | null>(null);

  useEffect(() => {
    (async () => {
      await layout_engine.load();

      layout_engine.register_default_layout(ide_preset);
      layout_engine.register_default_layout(ai_focus_preset);

      const selected_layout = (await window.storage.get(
        SELECTED_LAYOUT_KEY,
      )) as string;

      if (selected_layout) {
        setPreset(
          layout_engine.get_layout(selected_layout) ??
            layout_engine.get_layout("ide") ??
            null,
        );
      } else {
        setPreset(layout_engine.get_layout("ide") ?? null);
        window.storage.set(SELECTED_LAYOUT_KEY, "ide");
      }
    })();
  }, []);

  if (!preset) return null;

  return <LayoutRenderer layout_preset={preset} />;
}

export default App;
