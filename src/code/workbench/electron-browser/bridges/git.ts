import simpleGit, {
  SimpleGit,
  StatusResult,
  DefaultLogFields,
  ListLogLine,
} from "simple-git";

const gitInstanceMap: Map<string, SimpleGit> = new Map();

export interface GitBlameInfo {
  line: number;
  author: string;
  authorEmail: string;
  date: Date;
  hash: string;
  summary: string;
  content: string;
}

export interface GitFileHistory {
  hash: string;
  date: Date;
  message: string;
  author: string;
  authorEmail: string;
}

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

  /**
   * Get blame information for a file (who changed each line)
   * @param folderPath - Repository path
   * @param filePath - Relative path to file from repository root
   * @returns Array of blame information per line
   */
  async getFileBlame(
    folderPath: string,
    filePath: string,
  ): Promise<GitBlameInfo[]> {
    let git = gitInstanceMap.get(folderPath);

    if (!git) {
      git = simpleGit(folderPath);
      gitInstanceMap.set(folderPath, git);
    }

    const blameResult = await git.raw(["blame", "--line-porcelain", filePath]);

    return this.parseBlameOutput(blameResult);
  },

  /**
   * Get commit history for a specific file
   * @param folderPath - Repository path
   * @param filePath - Relative path to file from repository root
   * @param maxCount - Maximum number of commits to retrieve (default: 50)
   */
  async getFileHistory(
    folderPath: string,
    filePath: string,
    maxCount: number = 50,
  ): Promise<GitFileHistory[]> {
    let git = gitInstanceMap.get(folderPath);

    if (!git) {
      git = simpleGit(folderPath);
      gitInstanceMap.set(folderPath, git);
    }

    const log = await git.log({
      file: filePath,
      maxCount,
    });

    return log.all.map((commit) => ({
      hash: commit.hash,
      date: new Date(commit.date),
      message: commit.message,
      author: commit.author_name,
      authorEmail: commit.author_email,
    }));
  },

  /**
   * Get the diff for a specific file between commits
   * @param folderPath - Repository path
   * @param filePath - Relative path to file
   * @param fromCommit - Starting commit hash (optional, defaults to previous commit)
   * @param toCommit - Ending commit hash (optional, defaults to current state)
   */
  async getFileDiff(
    folderPath: string,
    filePath: string,
    fromCommit?: string,
    toCommit?: string,
  ): Promise<string> {
    let git = gitInstanceMap.get(folderPath);

    if (!git) {
      git = simpleGit(folderPath);
      gitInstanceMap.set(folderPath, git);
    }

    const commits =
      fromCommit && toCommit
        ? [fromCommit, toCommit]
        : fromCommit
          ? [fromCommit]
          : [];

    return await git.diff([...commits, "--", filePath]);
  },

  /**
   * Get file content at a specific commit
   * @param folderPath - Repository path
   * @param filePath - Relative path to file
   * @param commitHash - Commit hash (optional, defaults to HEAD)
   */
  async getFileAtCommit(
    folderPath: string,
    filePath: string,
    commitHash: string = "HEAD",
  ): Promise<string> {
    let git = gitInstanceMap.get(folderPath);

    if (!git) {
      git = simpleGit(folderPath);
      gitInstanceMap.set(folderPath, git);
    }

    return await git.show([`${commitHash}:${filePath}`]);
  },

  /**
   * Parse git blame porcelain output into structured data
   */
  parseBlameOutput(blameOutput: string): GitBlameInfo[] {
    const lines = blameOutput.split("\n");
    const blameInfo: GitBlameInfo[] = [];

    let currentBlame: Partial<GitBlameInfo> = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;

      if (line.match(/^[0-9a-f]{40}/)) {
        // New commit line
        const parts = line.split(" ");
        currentBlame.hash = parts[0]!;
        currentBlame.line = parseInt(parts[2]!, 10);
      } else if (line.startsWith("author ")) {
        currentBlame.author = line.substring(7);
      } else if (line.startsWith("author-mail ")) {
        currentBlame.authorEmail = line.substring(12).replace(/[<>]/g, "");
      } else if (line.startsWith("author-time ")) {
        currentBlame.date = new Date(parseInt(line.substring(12), 10) * 1000);
      } else if (line.startsWith("summary ")) {
        currentBlame.summary = line.substring(8);
      } else if (line.startsWith("\t")) {
        // Content line
        currentBlame.content = line.substring(1);

        if (currentBlame.hash && currentBlame.line !== undefined) {
          blameInfo.push(currentBlame as GitBlameInfo);
        }

        currentBlame = {};
      }
    }

    return blameInfo;
  },
};
