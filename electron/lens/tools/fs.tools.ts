import { Chat } from "@ridit/dev";
import fs from "node:fs/promises";
import { isAbsolute, join, dirname } from "node:path";
import { workspace } from "../../main-services/workspace-service";

async function resolve(p: string): Promise<string> {
  if (isAbsolute(p)) return p;
  const root = await workspace.get_current_workspace_path();
  return root ? join(root, p) : p;
}

export function register_fs_tools(chat: Chat) {
  chat.registerTool({
    name: "readFile",
    description: "Read the text content of a file — accepts absolute or workspace-relative paths",
    parameters: {
      path: { type: "string", description: "Absolute or workspace-relative path to the file" },
    },
    async onRun({ path: p }) {
      const content = await fs.readFile(await resolve(p), "utf8");
      return { content };
    },
  });

  chat.registerTool({
    name: "writeFile",
    description: "Write text content to a file, creating it and any missing parent directories if needed",
    parameters: {
      path: { type: "string", description: "Absolute or workspace-relative path to the file" },
      content: { type: "string", description: "Text content to write" },
    },
    async onRun({ path: p, content }) {
      const resolved = await resolve(p);
      await fs.mkdir(dirname(resolved), { recursive: true });
      await fs.writeFile(resolved, content, "utf8");
      return { ok: true };
    },
  });

  chat.registerTool({
    name: "listDirectory",
    description: "List files and folders inside a directory",
    parameters: {
      path: { type: "string", description: "Absolute or workspace-relative path to the directory" },
    },
    async onRun({ path: p }) {
      const items = await fs.readdir(await resolve(p), { withFileTypes: true });
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
      path: { type: "string", description: "Absolute or workspace-relative path to delete" },
    },
    async onRun({ path: p }) {
      await fs.rm(await resolve(p), { recursive: true });
      return { ok: true };
    },
  });

  chat.registerTool({
    name: "createDirectory",
    description: "Create a directory and any missing parent directories",
    parameters: {
      path: { type: "string", description: "Absolute or workspace-relative path to create" },
    },
    async onRun({ path: p }) {
      await fs.mkdir(await resolve(p), { recursive: true });
      return { ok: true };
    },
  });
}
