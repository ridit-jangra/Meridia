import { registerStandalone } from "../common/standalone.js";

export function registerStatusbarItem(item: HTMLSpanElement) {
  const _data = { message: item, userId: Date.now() };
  const _event = new CustomEvent("workbench.statusbar.register.item", {
    detail: _data,
  });
  document.dispatchEvent(_event);
}

export function removeStatusbarItem(_innerHtml: string) {
  const _data = { message: _innerHtml, userId: Date.now() };
  const _event = new CustomEvent("workbench.statusbar.remove.item", {
    detail: _data,
  });
  document.dispatchEvent(_event);
}

export class StatusbarEventListner {
  constructor() {
    this.startListening();
  }

  startListening() {
    document.addEventListener("workbench.statusbar.register.item", (_event) => {
      const statusbarEl = document.querySelector(
        ".statusbar"
      ) as HTMLDivElement;
      const itemSectionEl = statusbarEl.querySelector(".item-section");

      const _customEvent = _event as CustomEvent;
      const _item = _customEvent.detail.message;

      itemSectionEl?.appendChild(_item);
    });

    document.addEventListener("workbench.statusbar.remove.item", (_event) => {
      const statusbarEl = document.querySelector(
        ".statusbar"
      ) as HTMLDivElement;
      const itemSectionEl = statusbarEl.querySelector(".item-section");

      const _customEvent = _event as CustomEvent;
      const _innerHtml = _customEvent.detail.message;

      const spans = itemSectionEl!.querySelectorAll("span");
      const _target = Array.from(spans).find(
        (span) => span.innerHTML === _innerHtml
      );
      if (_target) {
        _target.remove();
      }
    });
  }
}

export const _statusbarEventListner = new StatusbarEventListner();
registerStandalone("statusbar-event-listner", _statusbarEventListner);
