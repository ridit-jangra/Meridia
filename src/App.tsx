import { useEffect, useState } from "react";
import { layout_engine } from "./layouts/layout.engine";
import { LayoutRenderer } from "./layouts/layout.renderer";
import { ide_preset } from "./layouts/presets/preset.ide";
import { agent_preset } from "./layouts/presets/preset.agent";
import { SELECTED_LAYOUT_KEY } from "../shared/storage-keys";
import { editor_preset } from "./layouts/presets/preset.editor";
import { shortcuts } from "./shortcut/shortcut.service";
import "./theme/theme.service";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { set_layout } from "./store/slices/layout.slice";

function App() {
  const active_id = useAppSelector((s) => s.layout.active);
  const dispatch = useAppDispatch();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await layout_engine.load();

      layout_engine.register_default_layout(ide_preset);
      layout_engine.register_default_layout(agent_preset);
      layout_engine.register_default_layout(editor_preset);

      const saved = await window.storage.get(SELECTED_LAYOUT_KEY, "ide");

      dispatch(set_layout(saved));
      setReady(true);
    })();
    // layout_engine.reset_all();
  }, []);

  useEffect(() => {
    window.storage.set(SELECTED_LAYOUT_KEY, active_id);
  }, [active_id]);

  useEffect(() => shortcuts.bind(window), []);

  if (!ready) return null;

  const preset = layout_engine.get_layout(active_id);
  if (!preset) return null;

  return <LayoutRenderer layout_preset={preset} />;
}

export default App;
