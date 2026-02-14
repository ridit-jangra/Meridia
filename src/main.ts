import "./services/theme/theme.service";
import "./services/shortcut/shortcut.init";

import "@vscode/codicons/dist/codicon.css";
import "./style.css";
import { layout_engine } from "./services/layouts/layout.engine";
import { LayoutRenderer } from "./services/layouts/layout.renderer";
import { shortcuts } from "./services/shortcut/shortcut.service";
import { ide_preset } from "./services/layouts/presets/preset.ide";
import { agent_preset } from "./services/layouts/presets/preset.agent";
import { editor_preset } from "./services/layouts/presets/preset.editor";

const root = document.getElementById("app")!;

await layout_engine.load();

layout_engine.register_default_layout(ide_preset);
layout_engine.register_default_layout(agent_preset);
layout_engine.register_default_layout(editor_preset);

const preset = layout_engine.get_layout("ide");
const lr = LayoutRenderer({ layout_preset: preset });

root.appendChild(lr.el);

const unbind = shortcuts.bind(document);

// layout_engine.reset_all();
