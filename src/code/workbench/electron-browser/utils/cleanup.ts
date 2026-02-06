import fs from "fs";
import { activeWatchers } from "../bridges/fs.js";

export function cleanupWatchers() {
  activeWatchers.forEach((watcher, path) => {
    try {
      fs.unwatchFile(path);
      watcher.close();
    } catch (error) {
      // Ignore cleanup errors
    }
  });
  activeWatchers.clear();
}
