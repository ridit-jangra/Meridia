import simpleGit from "simple-git";
import { event_emitter } from "../shared/emitter";
import { GIT_REFRESH_STATUS } from "../../shared/ipc/channels";
import { GitStatus } from "../../shared/types/git.types";

class git_service {
  public async push_status(repo_path: string) {
    try {
      const git = simpleGit(repo_path);
      const is_repo = await git.checkIsRepo().catch(() => false);
      if (!is_repo) return;

      const has_commits = await git
        .revparse(["HEAD"])
        .then(() => true)
        .catch(() => false);

      const [status, branch] = await Promise.all([
        git.status(),
        has_commits
          ? git.revparse(["--abbrev-ref", "HEAD"])
          : Promise.resolve("HEAD"),
      ]);

      event_emitter.emit("window.webContents.send", GIT_REFRESH_STATUS, {
        branch: branch.trim(),
        ahead: status.ahead,
        behind: status.behind,
        files: status.files as GitStatus["files"],
        has_commits,
      } satisfies GitStatus);
    } catch (err) {
      console.error("[git] push_status error:", err);
    }
  }

  public async is_git_repo(folder_path: string): Promise<boolean> {
    try {
      const git = simpleGit(folder_path);
      const isRepo = await git.checkIsRepo();
      if (!isRepo) return false;

      const root = await git.revparse(["--show-toplevel"]);
      return root.trim() === folder_path.trim();
    } catch (err) {
      console.error("[git] is_git_repo error:", err);
      return false;
    }
  }

  public async init_repo(folder_path: string): Promise<void> {
    try {
      const git = simpleGit(folder_path);
      await git.init();
    } catch (err) {
      console.error("[git] init_repo error:", err);
    }
  }
}

export const git = new git_service();
