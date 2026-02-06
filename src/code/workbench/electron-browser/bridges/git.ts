import simpleGit, { SimpleGit, StatusResult } from "simple-git";
import { ensureGitIgnore } from "../utils/git-helpers.js";

const gitInstanceMap: Map<string, SimpleGit> = new Map();

export const gitBridge = {
  async getStatus(folderPath: string) {
    ensureGitIgnore(folderPath);

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
