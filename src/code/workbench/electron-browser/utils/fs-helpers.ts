import fs from "fs";
import path from "path";

export function readDirRecursive(dirPath: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dirPath)) return results;

  const list = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const dirent of list) {
    const fullPath = path.join(dirPath, dirent.name);
    if (dirent.isDirectory()) {
      results = results.concat(readDirRecursive(fullPath));
    } else if (dirent.isFile()) {
      results.push(fullPath);
    }
  }
  return results;
}
