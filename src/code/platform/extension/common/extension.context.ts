import { api as _node } from "../api/workbench.node.api.js";
import { api as _workbench } from "../api/workbench.api.js";
import { EventCallback, on, send } from "./extension.event.js";
import { _merge } from "./extension.utils.js";

export const _context = {
  ..._merge(_node, _workbench),
};

export type context = typeof _context;

export const _contextEvent = {
  send: (_address: string, ...args: any[]) => {
    return send(_address, ...args);
  },
  on: (_address: string, callback: EventCallback) => {
    on(_address, callback);
  },
};
