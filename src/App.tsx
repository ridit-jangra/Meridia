import { useEffect, useState } from "react";
import { layout_engine } from "./layouts/layout.engine";
import { Renderer } from "./layouts/layout.renderer";
import { layout_preset } from "./layouts/presets/presets.type";

function App() {
  const [preset, setPreset] = useState<layout_preset | null>();

  useEffect(() => {
    setPreset(layout_engine.load("ide"));

    setTimeout(() => {
      setPreset(layout_engine.load("ai-focus"));
    }, 2000);
  }, []);

  if (preset) return <Renderer layout_preset={preset} />;
}

export default App;
