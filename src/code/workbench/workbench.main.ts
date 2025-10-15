import "./browser/workbench.web.js";
import "./common/workbench.theme.js";
import "./common/workbench.command.register.js";
import "./common/workbench.editor/workbench.editor.js";
import "./common/workbench.scrollbar.js";
import "./common/workbench.uistate.js";
import "./common/workbench.extension.listener.js";
import "./common/workbench.action.js";
import "./event/workbench.event.statusbar.js";
import "./event/workbench.event.panel.options.js";
import "./event/workbench.event.editor.js";
import "./services/workbench.resources.js";
import "../platform/mira/mira.workbench/workbench.mira.main.js";
import "../platform/extension/extension.main.js";

const python = window.python;
const path = window.path;

python.executeScript(path.join([path.__dirname, "scripts", "download.py"]));
