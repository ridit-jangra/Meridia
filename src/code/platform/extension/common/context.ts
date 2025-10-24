import { api as _node } from "../api/node.js";
import { api as _workbench } from "../api/api.js";
import { EventCallback, on, send } from "./event.js";
import { _merge } from "./utils.js";

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
