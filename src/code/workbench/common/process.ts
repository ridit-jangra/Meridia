export function runInstall(
  command: string,
  args: string[],
  onCompleteCallback: Function,
  onLogCallback: Function
) {
  window.ipc.on("workbench.workspace.install.log", (_: any, log: string) => {
    onLogCallback(log);
  });

  window.ipc.on("workbench.workspace.install.complete", () => {
    onCompleteCallback();
  });

  window.ipc.invoke("workbench.workspace.install", command, args);
}

export function runCommand(
  command: string,
  args: string[],
  onCompleteCallback: Function,
  onLogCallback: Function
) {
  window.ipc.on(
    "workbench.workspace.run.command.log",
    (_: any, log: string) => {
      onLogCallback(log);
    }
  );

  window.ipc.on("workbench.workspace.run.command.complete", () => {
    onCompleteCallback();
  });

  window.ipc.invoke("workbench.workspace.run.command", command, args);
}
