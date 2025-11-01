export class CoreEl {
  public _el: HTMLElement | null = null;

  public getDomElement() {
    if (!this._el) return;
    return this._el;
  }

  public destroy() {
    if (!this._el) return;
    this._el.remove();
  }
}
