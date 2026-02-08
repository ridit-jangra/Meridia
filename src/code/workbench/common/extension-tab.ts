import { ExtensionPage } from "../browser/extension-page";
import { getThemeIcon } from "../browser/media/icons";
import { IEditorTab, IExtension } from "../workbench.types";
import { _addContent } from "./tabs";
import { openTab } from "./utils";

export function openExtensionTab(extension: IExtension) {
  const uri = `tab://extension-${extension.name}-${extension.author}`;

  const _extensionPage = new ExtensionPage(extension);
  _addContent(uri, _extensionPage.getDomElement()!);

  const _tab: IEditorTab = {
    name: extension.name,
    icon: getThemeIcon("extension"),
    uri: uri,
    is_touched: false,
    active: true,
    badge: "D",
    status: "default",
  };

  openTab(_tab);
}
