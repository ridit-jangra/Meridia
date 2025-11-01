import { Splitter } from "../browser/parts/splitter/splitter.js";
import { getStandalone, registerStandalone } from "../common/class.js";
import { changePanelOptionsWidth } from "./panelOptions.js";

export function togglePanelVisibilty(_panel: HTMLElement) {
  const _data = { message: _panel, userId: Date.now() };
  const _event = new CustomEvent("workbench.panel.toggle.visibilty", {
    detail: _data,
  });
  document.dispatchEvent(_event);
}

export function setPanelVisibilty(_panel: HTMLElement, visibilty: boolean) {
  const _data = {
    message: { panel: _panel, visibilty: visibilty },
    userId: Date.now(),
  };
  const _event = new CustomEvent("workbench.panel.set.visibilty", {
    detail: _data,
  });
  document.dispatchEvent(_event);
}

export class PanelEventListner {
  constructor() {
    this.startListening();
  }

  startListening() {
    document.addEventListener("workbench.panel.toggle.visibilty", (_event) => {
      const _customEvent = _event as CustomEvent;
      const _panel = _customEvent.detail.message;

      if (!_panel) return;

      const _splitterVertical = getStandalone(
        "panel-splitter-vertical"
      ) as Splitter;
      const _splitterHorizontal = getStandalone(
        "panel-splitter-horizontal"
      ) as Splitter;

      if (!_splitterVertical && !_splitterHorizontal) return;

      const _indexNumberVertical = _splitterVertical.getIndex(_panel);
      const _indexNumberHorizontal = _splitterHorizontal.getIndex(_panel);

      _splitterVertical.togglePanel(_indexNumberVertical);
      _splitterHorizontal.togglePanel(_indexNumberHorizontal);

      changePanelOptionsWidth();
    });

    document.addEventListener("workbench.panel.set.visibilty", (_event) => {
      const _customEvent = _event as CustomEvent;
      const _data = _customEvent.detail.message;
      const _panel = _data.panel;
      const _visiblity = _data.visibilty;

      if (!_panel) return;

      const _splitterVertical = getStandalone(
        "panel-splitter-vertical"
      ) as Splitter;
      const _splitterHorizontal = getStandalone(
        "panel-splitter-horizontal"
      ) as Splitter;

      if (!_splitterVertical && !_splitterHorizontal) return;

      const _indexNumberVertical = _splitterVertical.getIndex(_panel);
      const _indexNumberHorizontal = _splitterHorizontal.getIndex(_panel);

      _splitterVertical.setPanel(_indexNumberVertical, _visiblity);
      _splitterHorizontal.setPanel(_indexNumberHorizontal, _visiblity);

      changePanelOptionsWidth();
    });
  }
}

export const _panelEventListner = new PanelEventListner();
registerStandalone("panel-event-listner", _panelEventListner);
