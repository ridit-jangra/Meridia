import { registerStandalone } from "../common/class.js";

export function changePanelOptionsWidth() {
  const _data = { userId: Date.now() };
  const _event = new CustomEvent("workbench.panel.options.change.width", {
    detail: _data,
  });
  document.dispatchEvent(_event);
}

export class PanelOptionsEventListner {
  constructor() {
    this.startListening();
  }

  startListening() {
    document.addEventListener(
      "workbench.panel.options.change.width",
      (_event) => {}
    );
  }
}

export const _panelOptionsEventListner = new PanelOptionsEventListner();
registerStandalone("panel-options-event-listner", _panelOptionsEventListner);
