import { Settings } from "../../browser/settings.js";
import { _addContent } from "../tabs.js";

const settings = new Settings();

_addContent("tab://settings", settings.getDomElement()!);
