import simpleGit, { SimpleGit, StatusResult } from "simple-git";

const gitInstanceMap: Map<string, SimpleGit> = new Map();

export const gitBridge = {
  async getStatus(folderPath: string) {
    let git = gitInstanceMap.get(folderPath);
    let status: StatusResult;

    if (!git) {
      git = simpleGit(folderPath);
      gitInstanceMap.set(folderPath, git);

      status = await git.status();
    }

    status = await git.status();

    return status;
  },
};
