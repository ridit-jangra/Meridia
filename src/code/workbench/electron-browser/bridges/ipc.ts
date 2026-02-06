import { ipcRenderer } from "electron";

export const ipcBridge = {
  send: (channel: string, ...args: any) => ipcRenderer.send(channel, ...args),

  invoke: async (channel: string, ...args: any) => {
    try {
      return await ipcRenderer.invoke(channel, ...args);
    } catch (e) {
      return false;
    }
  },

  on: (channel: string, func: Function) =>
    ipcRenderer.on(channel, (event, ...args) => func(event, ...args)),

  once: (channel: string, func: Function) =>
    ipcRenderer.once(channel, (event, ...args) => func(event, ...args)),

  removeAllListeners: (channel: string) =>
    ipcRenderer.removeAllListeners(channel),

  removeListener: (channel: string, listener: any) =>
    ipcRenderer.removeListener(channel, listener),
};
