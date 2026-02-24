import { history } from "./history.service";
import type { EventEmitter } from "../../core/event-emitter";

export function track(
  emitter: EventEmitter,
  event: string | symbol,
  kind?: string,
) {
  emitter.on(event, (...args: any[]) => {
    history.push(kind ?? String(event), args.length <= 1 ? args[0] : args);
  });
}
