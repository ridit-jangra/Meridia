import monaco from "./utils.js";
import { marked } from "marked";
import { IPreviewTab } from "../../workbench/workbench.types.js";
import { select } from "../../workbench/common/store/selector.js";
import { dispatch } from "../../workbench/common/store/store.js";
import { update_preview_tabs } from "../../workbench/common/store/slice.js";
import { registerStandalone } from "../../workbench/common/class.js";
import { getFileIcon } from "../../workbench/common/utils.js";

export class Preview {
  private _layout!: HTMLDivElement;
  private _contentContainer!: HTMLDivElement;
  private _mounted = false;
  private _currentModel: monaco.editor.ITextModel | null = null;
  private _contentChangeListener: monaco.IDisposable | null = null;
  private _isUpdatingState = false;

  _mount() {
    if (this._mounted) return;
    this._layout = document.querySelector(".preview-area") as HTMLDivElement;

    this._contentContainer = document.createElement("div");
    this._contentContainer.className =
      "preview-content markdown-body scrollbar-container";
    this._layout.appendChild(this._contentContainer);

    this._mounted = true;
  }

  async _preview(model: monaco.editor.ITextModel) {
    const content = model.getValue();
    const html = await marked.parse(content);
    this._contentContainer.innerHTML = html;
  }

  async _open(tab: IPreviewTab) {
    if (!this._mounted) this._mount();

    const model = monaco.editor.getModel(monaco.Uri.parse(tab.uri));
    if (!model) return;

    if (this._contentChangeListener) {
      this._contentChangeListener.dispose();
      this._contentChangeListener = null;
    }

    this._currentModel = model;

    await this._preview(model);

    this._contentChangeListener = model.onDidChangeContent(async () => {
      if (this._currentModel === model) {
        await this._preview(model);
      }
    });

    if (this._isUpdatingState) return;

    const currentTabs = select((s) => s.main.preview_tabs);
    const existingTabIndex = currentTabs.findIndex((t) => t.uri === tab.uri);

    let needsUpdate = false;
    let updatedTabs: IPreviewTab[] = [];

    if (existingTabIndex !== -1) {
      if (currentTabs[existingTabIndex]!.active) {
        needsUpdate = true;

        updatedTabs = currentTabs.map((t) => ({
          ...t,
          active: false,
        }));
      } else {
        needsUpdate = true;
        updatedTabs = currentTabs.map((t, index) => ({
          ...t,
          active: index === existingTabIndex,
        }));
      }
    } else {
      needsUpdate = true;
      const newTab: IPreviewTab = {
        name: tab.name,
        uri: tab.uri,
        active: true,
        icon: tab.icon || getFileIcon("file.md"),
      };

      updatedTabs = [
        ...currentTabs.map((t) => ({ ...t, active: false })),
        newTab,
      ];
    }

    if (needsUpdate) {
      this._isUpdatingState = true;
      dispatch(update_preview_tabs(updatedTabs));

      setTimeout(() => {
        this._isUpdatingState = false;
      }, 0);
    }
  }
}

export const _preview = new Preview();
registerStandalone("preview", _preview);
