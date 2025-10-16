import { _merge } from "../common/extension.utils.js";
import { api as _editor } from "./workbench.editor.api.js";
import { api as _statusbar } from "./workbench.statusbar.api.js";
import { api as _utils } from "./workbench.utils.api.js";
import { api as _storage } from "./workbench.storage.api.js";
import { api as _panel } from "./workbench.panel.api.js";

export const api = {
  workbench: _merge(_editor, _statusbar, _utils, _storage, _panel),
};
