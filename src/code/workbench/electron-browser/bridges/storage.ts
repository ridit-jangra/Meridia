import { Storage } from "../../node/storage.js";

const storage = Storage;

export const storageBridge = {
  store: (_name: string, _value: any) => {
    storage.store(_name, _value);
  },
  update: (_name: string, _value: any) => {
    storage.update(_name, _value);
  },
  get: (_name: string) => {
    const _val = storage.get(_name);
    return _val;
  },
  remove: (_name: string) => {
    storage.remove(_name);
  },
};
