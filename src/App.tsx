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
import {
  set_active_layout_id,
  update_preset,
} from "./store/slices/layout.slice";

function App() {
  const active_layout_id = useAppSelector((s) => s.layout.active_layout_id);
  const presets = useAppSelector((s) => s.layout.presets);
  const dispatch = useAppDispatch();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await layout_engine.load();

      const ide = layout_engine.register_default_layout(ide_preset);
      const agent = layout_engine.register_default_layout(agent_preset);
      const editor = layout_engine.register_default_layout(editor_preset);

      dispatch(update_preset(ide));
      dispatch(update_preset(agent));
      dispatch(update_preset(editor));

      const saved = await window.storage.get(SELECTED_LAYOUT_KEY, "ide");
      dispatch(set_active_layout_id(saved));
      setReady(true);
    })();
  }, [dispatch]);

  useEffect(() => {
    window.storage.set(SELECTED_LAYOUT_KEY, active_layout_id);
  }, [active_layout_id]);

  useEffect(() => shortcuts.bind(window), []);

  if (!ready) return null;

  const preset =
    presets[active_layout_id] || layout_engine.get_layout(active_layout_id);
  if (!preset) return null;

  return <LayoutRenderer layout_preset={preset} />;
}

export default App;
