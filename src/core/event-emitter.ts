type EventKey = string | symbol;
type AnyFn = (...args: any[]) => any;

export class EventEmitter {
  private _events = new Map<EventKey, AnyFn[]>();
  private _max = 0;

  setMaxListeners(n: number) {
    this._max = Math.max(0, n | 0);
    return this;
  }

  getMaxListeners() {
    return this._max;
  }

  on(event: EventKey, listener: AnyFn) {
    const arr = this._events.get(event);
    if (!arr) {
      this._events.set(event, [listener]);
      return this;
    }
    arr.push(listener);

    if (this._max > 0 && arr.length > this._max) {
    }

    return this;
  }

  addListener(event: EventKey, listener: AnyFn) {
    return this.on(event, listener);
  }

  once(event: EventKey, listener: AnyFn) {
    const wrapper: AnyFn = (...args) => {
      this.off(event, wrapper);
      return listener(...args);
    };
    (wrapper as any)._original = listener;
    return this.on(event, wrapper);
  }

  off(event: EventKey, listener: AnyFn) {
    const arr = this._events.get(event);
    if (!arr || arr.length === 0) return this;

    const next = arr.filter(
      (fn) => fn !== listener && (fn as any)._original !== listener,
    );

    if (next.length === 0) this._events.delete(event);
    else this._events.set(event, next);

    return this;
  }

  removeListener(event: EventKey, listener: AnyFn) {
    return this.off(event, listener);
  }

  emit(event: EventKey, ...args: any[]) {
    const arr = this._events.get(event);
    if (!arr || arr.length === 0) return false;

    const snapshot = arr.slice();
    for (const fn of snapshot) fn(...args);

    return true;
  }

  removeAllListeners(event?: EventKey) {
    if (event === undefined) this._events.clear();
    else this._events.delete(event);
    return this;
  }

  listeners(event: EventKey) {
    return (this._events.get(event) ?? []).slice();
  }

  listenerCount(event: EventKey) {
    return this._events.get(event)?.length ?? 0;
  }

  eventNames() {
    return Array.from(this._events.keys());
  }
}
