import { ipcRenderer, clipboard } from "electron";

export const workbenchBridge = {
  reload: () => {
    ipcRenderer.invoke("workbench.reload");
  },
  clipboard: {
    writeText: (text: string) => clipboard.writeText(text),
    readText: () => clipboard.readText(),
  },
};
