import { files } from "../../browser/files.js";
import { select } from "../store/selector.js";
import { minimatch } from "minimatch";

let gitignorePatterns: string[] = [];
let lastGitignorePath: string | null = null;

async function loadGitignore(baseFolder: string): Promise<string[]> {
  const gitignorePath = window.path.join([baseFolder, ".gitignore"]);

  // Return cached patterns if same folder
  if (gitignorePatterns.length > 0 && lastGitignorePath === gitignorePath) {
    return gitignorePatterns;
  }

  try {
    const gitignoreExists = await window.fs.exists(gitignorePath);

    if (gitignoreExists) {
      const content = await window.fs.readFile(gitignorePath, "utf-8");

      // Parse gitignore patterns
      gitignorePatterns = content
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#")); // Remove empty lines and comments

      lastGitignorePath = gitignorePath;
    } else {
      gitignorePatterns = [];
    }
  } catch (error) {
    console.warn("Failed to load .gitignore:", error);
    gitignorePatterns = [];
  }

  return gitignorePatterns;
}

function shouldIgnoreFile(relativePath: string, patterns: string[]): boolean {
  if (!relativePath) return false;

  // Normalize path separators to forward slashes for consistency
  const normalizedPath = relativePath.replace(/\\/g, "/");

  for (const pattern of patterns) {
    // Skip negation patterns (starting with !)
    if (pattern.startsWith("!")) {
      continue;
    }

    // Remove leading slash if present
    const cleanPattern = pattern.replace(/^\//, "");

    // Check if pattern matches
    // If pattern contains no /, it should match at any directory level
    if (!cleanPattern.includes("/")) {
      // Match filename at any level
      const parts = normalizedPath.split("/");
      if (parts.some((part) => minimatch(part, cleanPattern))) {
        return true;
      }
      // Also check full path
      if (minimatch(normalizedPath, cleanPattern)) {
        return true;
      }
    } else {
      // Pattern with / should match from root
      if (minimatch(normalizedPath, cleanPattern, { matchBase: false })) {
        return true;
      }
    }

    // Handle directory patterns (ending with /)
    if (pattern.endsWith("/")) {
      const dirPattern = cleanPattern.slice(0, -1);
      if (
        normalizedPath.startsWith(dirPattern + "/") ||
        normalizedPath === dirPattern
      ) {
        return true;
      }
    }

    // Handle ** patterns
    if (cleanPattern.includes("**")) {
      if (minimatch(normalizedPath, cleanPattern, { dot: true })) {
        return true;
      }
    }
  }

  return false;
}

export async function update_status() {
  const folder_structure = select((s) => s.main.folder_structure);

  if (!folder_structure || !folder_structure.uri) return;

  const baseFolder = folder_structure.uri;

  const status = await window.git.getStatus(baseFolder);

  let not_added: string[] = [];
  let modified: string[] = [];
  let ignored: string[] = [];

  status.not_added.map((v) => {
    const new_v = window.path.join([baseFolder, v]);
    not_added.push(new_v);
  });

  status.modified.map((v) => {
    const new_v = window.path.join([baseFolder, v]);
    modified.push(new_v);
  });

  if (status.ignored) {
    status.ignored?.map((v) => {
      const new_v = window.path.join([baseFolder, v]);
      ignored.push(new_v);
    });
  }

  files._renderer.updateGitStatus(not_added, modified, ignored);
}

async function handleFileChange(nodeUri: string) {
  const folder_structure = select((s) => s.main.folder_structure);

  if (!folder_structure || !folder_structure.uri) return;

  const baseFolder = folder_structure.uri;

  // Get relative path from base folder
  const relativePath = window.path.relative(baseFolder, nodeUri);

  // Load gitignore patterns
  const patterns = await loadGitignore(baseFolder);

  // Check if file should be ignored
  if (shouldIgnoreFile(relativePath, patterns)) {
    console.log("Ignoring file (matches .gitignore):", relativePath);
    return;
  }

  // File is not ignored, update status
  console.log("Updating status for:", relativePath);
  update_status();
}

update_status();

window.ipc.on("files-node-changed", (event: any) => {
  const nodeUri = event.nodeUri || event;
  handleFileChange(nodeUri);
});

window.ipc.on("files-node-added", (event: any) => {
  const nodeUri = event.parentUri
    ? window.path.join([event.parentUri, event.nodeName])
    : event;
  handleFileChange(nodeUri);
});

window.ipc.on("files-node-removed", (event: any) => {
  const nodeUri = event.nodeUri || event;
  handleFileChange(nodeUri);
});
