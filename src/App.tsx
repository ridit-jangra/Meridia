import { useEffect, useState } from "react";
import { layout_engine } from "./layouts/layout.engine";
import { LayoutRenderer } from "./layouts/layout.renderer";
import { TLayoutPreset } from "./layouts/presets/preset.types";
import { ide_preset } from "./layouts/presets/preset.ide";
import { agent_preset } from "./layouts/presets/agent.preset";
import { SELECTED_LAYOUT_KEY } from "../shared/storage-keys";
import { editor_preset } from "./layouts/presets/editor.preset";

function App() {
  const [preset, setPreset] = useState<TLayoutPreset | null>(null);

  useEffect(() => {
    (async () => {
      await layout_engine.load();

      layout_engine.register_default_layout(ide_preset);
      layout_engine.register_default_layout(agent_preset);
      layout_engine.register_default_layout(editor_preset);

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
