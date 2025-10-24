import { registerStandalone } from "../common/standalone.js";

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
      (_event) => {
        const leftPanelOptionEl = document.querySelector(
          ".left-panel-options"
        ) as HTMLDivElement;

        const rightPanelOptionEl = document.querySelector(
          ".right-panel-options"
        ) as HTMLDivElement;

        const leftPanel = document.querySelector(
          ".left-panel"
        ) as HTMLDivElement;

        const rightPanel = document.querySelector(
          ".right-panel"
        ) as HTMLDivElement;

        leftPanelOptionEl.style.width = leftPanel.clientWidth + "px";
        rightPanelOptionEl.style.width = rightPanel.clientWidth + "px";

        if (leftPanel.clientWidth < 30) {
          leftPanelOptionEl.style.visibility = "hidden";
        } else {
          leftPanelOptionEl.style.visibility = "visible";
        }

        if (rightPanel.clientWidth < 30) {
          rightPanelOptionEl.style.visibility = "hidden";
          return;
        } else {
          rightPanelOptionEl.style.visibility = "visible";
        }
      }
    );
  }
}

export const _panelOptionsEventListner = new PanelOptionsEventListner();
registerStandalone("panel-options-event-listner", _panelOptionsEventListner);
