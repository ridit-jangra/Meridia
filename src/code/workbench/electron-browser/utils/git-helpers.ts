import fs from "fs";
import path from "path";

const DEFAULT_GITIGNORE = `
node_modules/
.venv/
dist/
build/
out/
.env
*.log
.DS_Store
`;

export function ensureGitIgnore(repoPath: string) {
  const gitignorePath = path.join(repoPath, ".gitignore");

  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, DEFAULT_GITIGNORE.trim() + "\n");
    return;
  }

  const content = fs.readFileSync(gitignorePath, "utf8");

  const entries = [
    "node_modules/",
    ".venv/",
    "dist/",
    "build/",
    "out/",
    ".env",
    "*.log",
  ];

  let updated = content;
  let changed = false;

  for (const entry of entries) {
    if (!content.includes(entry)) {
      updated += `\n${entry}`;
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(gitignorePath, updated.trim() + "\n");
  }
}
