import fs from "fs";
import path from "path";

export const editorBridge = {
  getFsSuggestions: (currentPath: string) => {
    try {
      const resolvedPath = path.resolve(currentPath || ".");
      const items = fs.readdirSync(resolvedPath, { withFileTypes: true });

      return items.map((item) => ({
        name: item.name,
        isDirectory: item.isDirectory(),
        path: path.join(resolvedPath, item.name),
      }));
    } catch (error) {
      return [];
    }
  },
};
