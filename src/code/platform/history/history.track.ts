import { EventEmitter } from "../../workbench/contrib/core/event-emitter";
import { history } from "./history.service";

export function track(
  emitter: EventEmitter,
  event: string | symbol,
  kind?: string,
) {
  emitter.on(event, (...args: any[]) => {
    history.push(kind ?? String(event), args.length <= 1 ? args[0] : args);
  });
}
