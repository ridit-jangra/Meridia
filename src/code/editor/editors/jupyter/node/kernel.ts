import {
  KernelManager,
  SessionManager,
  ServerConnection,
  type KernelMessage,
} from "@jupyterlab/services";
import { IKernelConnection } from "@jupyterlab/services/lib/kernel/kernel";
import { ISessionConnection } from "@jupyterlab/services/lib/session/session";
import { Storage } from "../../../../workbench/node/storage";
import {
  IFolderStructure,
  IProjectDetails,
} from "../../../../workbench/workbench.types";
import fs from "fs";
import path from "path";
import { ChildProcess, spawn } from "child_process";
import { ipcMain, BrowserWindow } from "electron";
import { IHeader } from "@jupyterlab/services/lib/kernel/messages";

const DEFAULT_PORT = 9186;
let jupyterProcess: ChildProcess | null = null;
let jupyterPort: number = DEFAULT_PORT;

const sessions = new Map<
  string,
  {
    kernel: IKernelConnection;
    session: ISessionConnection;
    kernelManager: KernelManager;
    sessionManager: SessionManager;
  }
>();

// Store pending stdin requests
const pendingStdinRequests = new Map<
  string,
  {
    resolve: (value: string) => void;
    prompt: string;
  }
>();

function getJupyterPort(): number {
  const stored =
    (Storage.get("workbench.jupyter.port") as number | undefined) ??
    jupyterPort ??
    DEFAULT_PORT;
  return stored;
}

export function startKernel(): Promise<boolean> {
  const folder_structure = Storage.get(
    "workbench.workspace.folder.structure",
  ) as IFolderStructure;
  if (!folder_structure) return Promise.resolve(false);

  const uri = folder_structure.uri;
  let data: IProjectDetails;

  try {
    const meridiaUri = path.join(uri, ".meridia");
    const configFile = path.join(meridiaUri, "editor.json");
    data = JSON.parse(
      fs.readFileSync(configFile, { encoding: "utf-8" }),
    ) as IProjectDetails;
  } catch (err) {
    data = {} as IProjectDetails;
  }

  const pythonPath = data?.venv?.python || "python";

  return new Promise((resolve, reject) => {
    if (jupyterProcess) {
      return resolve(true);
    }

    jupyterPort = DEFAULT_PORT;

    jupyterProcess = spawn(
      pythonPath,
      [
        "-m",
        "notebook",
        `--port=${DEFAULT_PORT}`,
        "--no-browser",
        "--IdentityProvider.token=",
        "--ServerApp.disable_check_xsrf=True",
        "--ServerApp.allow_origin=*",
      ],
      {
        cwd: uri,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );

    let settled = false;

    const ok = () => {
      if (!settled) {
        settled = true;
        Storage.store("workbench.jupyter.port", jupyterPort);
        resolve(true);
      }
    };

    const fail = (err: Error) => {
      if (!settled) {
        settled = true;
        jupyterProcess = null;
        reject(err);
      }
    };

    jupyterProcess.stdout?.on("data", (data) => {
      const msg = data.toString();

      const m = msg.match(/http:\/\/localhost:(\d+)\/tree/);
      if (m) {
        jupyterPort = Number(m[1]);

        ok();
      }
    });

    jupyterProcess.stderr?.on("data", (data) => {
      const msg = data.toString();

      if (/Traceback|Error/i.test(msg)) {
        fail(new Error("Failed to start Jupyter: " + msg));
      }
    });

    jupyterProcess.on("exit", (code) => {
      jupyterProcess = null;
      if (!settled) {
        fail(new Error("Jupyter exited with code " + code));
      }
    });
  });
}

export function stopKernel() {
  if (jupyterProcess) {
    jupyterProcess.kill();
    jupyterProcess = null;
  }
}

export async function connectToKernel() {
  const port = getJupyterPort();
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

    sessions.set(sessionId, {
      kernel,
      session,
      kernelManager,
      sessionManager,
    });

    return {
      sessionId,
      kernelId: kernel.id,
      status: kernel.status,
      port,
    };
  } catch (error) {
    kernelManager.dispose();
    sessionManager.dispose();
    console.error("connecting error", error);
    throw error;
  }
}

export async function executeToKernel(
  sessionId: string,
  code: string,
  mainWindow?: BrowserWindow,
) {
  const connection = sessions.get(sessionId);
  if (!connection) {
    throw new Error("Session not found");
  }

  const { kernel } = connection;

  const future = kernel.requestExecute({
    code,
    allow_stdin: true, // Enable stdin
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

  // Handle stdin requests
  future.onStdin = async (msg) => {
    if (msg.header.msg_type === "input_request") {
      const inputMsg = msg as KernelMessage.IInputRequestMsg;
      const prompt = inputMsg.content.prompt || "";

      // Send request to renderer process
      if (mainWindow) {
        const requestId = `stdin-${Date.now()}-${Math.random()}`;

        // Wait for user input from renderer
        const userInput = await new Promise<string>((resolve) => {
          pendingStdinRequests.set(requestId, { resolve, prompt });
          mainWindow.webContents.send("jupyter-stdin-request", {
            requestId,
            prompt,
          });
        });

        // Send the input back to the kernel
        kernel.sendInputReply(
          { value: userInput, status: "ok" },
          msg.header as IHeader<"input_request">,
        );
      }
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

ipcMain.handle("workbench.workspace.start.kernel", () => {
  return startKernel();
});

ipcMain.handle("workbench.workspace.connect.kernel", async () => {
  return await connectToKernel();
});

ipcMain.handle(
  "workbench.workspace.execute.kernel",
  async (event, sessionId: string, code: string) => {
    const mainWindow = BrowserWindow.fromWebContents(event.sender);
    return await executeToKernel(sessionId, code, mainWindow || undefined);
  },
);

ipcMain.handle(
  "workbench.workspace.shutdown.session",
  async (_, sessionId: string) => {
    return await shutdownSession(sessionId);
  },
);

// Handle stdin response from renderer
ipcMain.handle(
  "workbench.workspace.stdin.response",
  async (_, requestId: string, value: string) => {
    const request = pendingStdinRequests.get(requestId);
    if (request) {
      request.resolve(value);
      pendingStdinRequests.delete(requestId);
    }
  },
);
