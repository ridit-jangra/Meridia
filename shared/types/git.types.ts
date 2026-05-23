export type GitFileIndex = " " | "M" | "A" | "D" | "R" | "C" | "U" | "?" | "!";

export type GitFileStatus = {
  path: string;
  index: GitFileIndex;
  working_dir: GitFileIndex;
};

export type GitStatus = {
  branch: string;
  ahead: number;
  behind: number;
  files: GitFileStatus[];
  has_commits: boolean;
};
