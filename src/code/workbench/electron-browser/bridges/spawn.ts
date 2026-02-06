import { spawn, SpawnOptionsWithoutStdio } from "child_process";

export const spawnBridge = {
  spawn: (
    command: string,
    args: string[] = [],
    options: SpawnOptionsWithoutStdio = {},
  ) => {
    return spawn(command, args, options);
  },
};
