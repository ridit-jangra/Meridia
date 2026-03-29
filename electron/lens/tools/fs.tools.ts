import { Chat } from "@ridit/dev";
import fs from "node:fs/promises";
import path from "node:path";

export function register_fs_tools(chat: Chat) {
  chat.registerTool({
    name: "readFile",
    description: "Read the text content of a file",
    parameters: {
      path: { type: "string", description: "Absolute path to the file" },
    },
    async onRun({ path: p }) {
      const content = await fs.readFile(p, "utf8");
      return { content };
    },
  });

  chat.registerTool({
    name: "writeFile",
    description: "Write text content to a file, creating it and any missing parent directories if needed",
    parameters: {
      path: { type: "string", description: "Absolute path to the file" },
      content: { type: "string", description: "Text content to write" },
    },
    async onRun({ path: p, content }) {
      await fs.mkdir(path.dirname(p), { recursive: true });
      await fs.writeFile(p, content, "utf8");
      return { ok: true };
    },
  });

  chat.registerTool({
    name: "listDirectory",
    description: "List files and folders inside a directory",
    parameters: {
      path: { type: "string", description: "Absolute path to the directory" },
    },
    async onRun({ path: p }) {
      const items = await fs.readdir(p, { withFileTypes: true });
      return {
        items: items.map((d) => ({
          name: d.name,
          type: d.isDirectory() ? "directory" : "file",
        })),
      };
    },
  });

  chat.registerTool({
    name: "deleteFile",
    description: "Delete a file or directory",
    parameters: {
      path: { type: "string", description: "Absolute path to delete" },
    },
    async onRun({ path: p }) {
      await fs.rm(p, { recursive: true });
      return { ok: true };
    },
  });

  chat.registerTool({
    name: "createDirectory",
    description: "Create a directory and any missing parent directories",
    parameters: {
      path: { type: "string", description: "Absolute path to create" },
    },
    async onRun({ path: p }) {
      await fs.mkdir(p, { recursive: true });
      return { ok: true };
    },
  });
}
