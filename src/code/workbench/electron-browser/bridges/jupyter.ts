import { ipcRenderer } from "electron";

export const jupyterBridge = {
  startKernel: async () => {
    return await ipcRenderer.invoke("workbench.workspace.start.kernel");
  },
  connectToKernel: async (): Promise<{
    sessionId: string;
    kernelId: string;
    status: string;
  }> => {
    return await ipcRenderer.invoke("workbench.workspace.connect.kernel");
  },
  executeToKernel: async (sessionId: string, code: string) => {
    return await ipcRenderer.invoke(
      "workbench.workspace.execute.kernel",
      sessionId,
      code,
    );
  },
  shutdownSession: async (sessionId: string) => {
    return await ipcRenderer.invoke(
      "workbench.workspace.shutdown.session",
      sessionId,
    );
  },
};
