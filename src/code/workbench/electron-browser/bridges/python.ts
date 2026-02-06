import { spawn } from "child_process";

export const pythonBridge = {
  executeScript: (
    scriptPath: string,
    args: string[] = [],
  ): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const logs: string[] = [];

      // Spawn Python process in background (non-blocking)
      const python = spawn("python", [scriptPath, ...args], {
        detached: true,
        stdio: ["ignore", "pipe", "pipe"],
      });

      python.stdout?.on("data", (data) => {
        logs.push(data.toString().trim());
      });

      python.stderr?.on("data", (data) => {
        reject(new Error(data.toString()));
      });

      python.on("close", (code) => {
        if (code === 0) {
          resolve(logs);
        } else {
          reject(new Error(`Python process exited with code ${code}`));
        }
      });
    });
  },
};
