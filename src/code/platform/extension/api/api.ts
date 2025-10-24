import { _merge } from "../common/utils.js";
import { api as _editor } from "./editor.js";
import { api as _statusbar } from "./statusbar.js";
import { api as _utils } from "./utils.js";
import { api as _storage } from "./storage.js";
import { api as _panel } from "./panel.js";

export const api = {
  workbench: _merge(_editor, _statusbar, _utils, _storage, _panel),
};
