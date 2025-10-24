import "./browser/web.js";
import "./common/theme.js";
import "./common/commandRegister.js";
import "./common/scrollbar.js";
import "./common/state.js";
import "./common/extensionListener.js";
import "./common/action.js";
import "./event/statusbar.js";
import "./event/panelOptions.js";
import "./event/editor.js";
import "./services/resources.js";
import "../platform/mira/workbench/mira.js";
import "../platform/extension/extension.js";
import "../editor/standalone/standalone.js";

const python = window.python;
const path = window.path;

python.executeScript(path.join([path.__dirname, "scripts", "download.py"]));
