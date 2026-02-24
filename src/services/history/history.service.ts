import type { history_action } from "../../../shared/types/history.types";

export class history_service {
  private max: number;
  private items: history_action[] = [];

  constructor(max = 400) {
    this.max = Math.max(1, max | 0);
  }

  push(kind: string, data?: any) {
    this.items.push({ t: Date.now(), kind, data });
    const extra = this.items.length - this.max;
    if (extra > 0) this.items.splice(0, extra);
  }

  list(limit = 100) {
    const n = Math.max(0, limit | 0);
    if (n === 0) return [];
    return this.items.slice(-n);
  }

  last() {
    return this.items[this.items.length - 1];
  }

  clear() {
    this.items = [];
  }

  set_max(n: number) {
    this.max = Math.max(1, n | 0);
    const extra = this.items.length - this.max;
    if (extra > 0) this.items.splice(0, extra);
  }
}

export const history = new history_service();
