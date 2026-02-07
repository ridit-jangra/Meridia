import simpleGit, { SimpleGit, StatusResult } from "simple-git";

const gitInstanceMap: Map<string, SimpleGit> = new Map();

export const gitBridge = {
  async getStatus(folderPath: string) {
    let git = gitInstanceMap.get(folderPath);
    let status: StatusResult;

    if (!git) {
      git = simpleGit(folderPath);
      gitInstanceMap.set(folderPath, git);
    }

    status = await git.status(["--ignored"]);

    return status;
  },

  async commit(commit_message: string, folderPath: string, files: string[]) {
    let git = gitInstanceMap.get(folderPath);

    if (!git) {
      git = simpleGit(folderPath);
      gitInstanceMap.set(folderPath, git);
    }

    await git.add(files);

    await git.commit(commit_message);
  },
};
