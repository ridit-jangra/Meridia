// main/kernel.ts
import {
  KernelManager,
  SessionManager,
  ServerConnection,
  type KernelMessage,
} from "@jupyterlab/services";
import { Storage } from "../../../../workbench/node/storage";
import {
  IFolderStructure,
  IProjectDetails,
} from "../../../../workbench/workbench.types";
import fs from "fs";
import path from "path";
import { ChildProcess, spawn } from "child_process";
import { IKernelConnection } from "@jupyterlab/services/lib/kernel/kernel";
import { ISessionConnection } from "@jupyterlab/services/lib/session/session";
import { ipcMain } from "electron";

const port = 9186;
let jupyterProcess: ChildProcess | null = null;

// Store sessions by ID - keeps objects in main process
const sessions = new Map<
  string,
  {
    kernel: IKernelConnection;
    session: ISessionConnection;
    kernelManager: KernelManager;
    sessionManager: SessionManager;
  }
>();

export function startKernel() {
  const folder_structure = Storage.get(
    "workbench.workspace.folder.structure"
  ) as IFolderStructure;
  if (!folder_structure) return false;

  const uri = folder_structure.uri;
  let data: IProjectDetails;

  try {
    const meridiaUri = path.join(uri, ".meridia");
    const configFile = path.join(meridiaUri, "editor.json");
    data = JSON.parse(
      fs.readFileSync(configFile, { encoding: "utf-8" })
    ) as IProjectDetails;
  } catch {
    data = {} as IProjectDetails;
  }

  const pythonPath = data?.venv?.python || "python";

  jupyterProcess = spawn(
    pythonPath,
    [
      "-m",
      "notebook",
      "--port=" + port.toString(),
      "--IdentityProvider.token=",
      "--ServerApp.disable_check_xsrf=True",
      "--ServerApp.allow_origin=*",
      "--no-browser",
    ],
    {
      cwd: uri,
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  return true;
}

export function stopKernel() {
  if (jupyterProcess) {
    jupyterProcess.kill();
    jupyterProcess = null;
  }
}

export async function connectToKernel() {
  const baseUrl = `http://localhost:${port}`;

  const serverSettings = ServerConnection.makeSettings({
    baseUrl,
    token: "",
  });

  const kernelManager = new KernelManager({ serverSettings });
  const sessionManager = new SessionManager({
    serverSettings,
    kernelManager,
  });

  try {
    const session = await sessionManager.startNew({
      path: "test.ipynb",
      type: "notebook",
      name: "my-session",
      kernel: { name: "python3" },
    });

    const kernel = session.kernel;

    if (!kernel) {
      throw new Error("No kernel available");
    }

    const sessionId = session.id;

    // Store in main process
    sessions.set(sessionId, {
      kernel,
      session,
      kernelManager,
      sessionManager,
    });

    // Return only serializable data
    return {
      sessionId,
      kernelId: kernel.id,
      status: kernel.status,
    };
  } catch (error) {
    kernelManager.dispose();
    sessionManager.dispose();
    throw error;
  }
}

export async function executeToKernel(sessionId: string, code: string) {
  const connection = sessions.get(sessionId);
  if (!connection) {
    throw new Error("Session not found");
  }

  const { kernel } = connection;

  const future = kernel.requestExecute({
    code,
    allow_stdin: false,
  });

  let output = "";
  let result: any;
  let error = "";

  future.onIOPub = (msg) => {
    if (msg.header.msg_type === "stream") {
      const streamMsg = msg as KernelMessage.IStreamMsg;
      output += streamMsg.content.text;
    } else if (msg.header.msg_type === "execute_result") {
      const resultMsg = msg as KernelMessage.IExecuteResultMsg;
      result = resultMsg.content.data;
    } else if (msg.header.msg_type === "error") {
      const errorMsg = msg as KernelMessage.IErrorMsg;
      error = errorMsg.content.ename + ": " + errorMsg.content.evalue;
    }
  };

  await future.done;

  return { output, result, error };
}

export async function shutdownSession(sessionId: string) {
  const connection = sessions.get(sessionId);
  if (!connection) {
    return;
  }

  const { session, kernelManager, sessionManager } = connection;

  await session.shutdown();
  sessionManager.dispose();
  kernelManager.dispose();
  sessions.delete(sessionId);
}

// IPC Handlers
ipcMain.handle("workbench.workspace.start.kernel", () => {
  return startKernel();
});

ipcMain.handle("workbench.workspace.connect.kernel", async () => {
  return await connectToKernel();
});

ipcMain.handle(
  "workbench.workspace.execute.kernel",
  async (_, sessionId: string, code: string) => {
    return await executeToKernel(sessionId, code);
  }
);

ipcMain.handle(
  "workbench.workspace.shutdown.session",
  async (_, sessionId: string) => {
    return await shutdownSession(sessionId);
  }
);
