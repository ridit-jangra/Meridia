import { IFolderStructure } from "../workbench.types.js";
import fs from "fs";
import path from "path";

export async function walkdir(
  dir_path: string,
  level: number = 1
): Promise<IFolderStructure> {
  const rootPath = path.resolve(dir_path);

  try {
    const stat = fs.statSync(rootPath);
    if (!stat.isDirectory())
      throw new Error(`Path is not a directory: ${dir_path}`);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Path does not exist: ${dir_path}`);
    }
    throw err;
  }

  const maxDepth = level <= 0 ? Infinity : level;
  const root = await buildFolderStructure(rootPath, maxDepth);
  return root;
}

async function buildFolderStructure(
  rootPath: string,
  maxDepth: number
): Promise<IFolderStructure> {
  const rootName = path.basename(rootPath) || rootPath;
  const rootUri = rootPath;

  const root: IFolderStructure = {
    name: rootName,
    uri: rootUri,
    type: "folder",
    isRoot: true,
    children: [],
  };

  await fillChildren(root, 0, maxDepth);

  sortChildrenRecursive(root);
  return root;
}

async function fillChildren(
  node: IFolderStructure,
  currentDepth: number,
  maxDepth: number
) {
  if (currentDepth >= maxDepth) return;

  let dirents: fs.Dirent[];
  try {
    dirents = fs.readdirSync(node.uri, { withFileTypes: true });
  } catch (err) {
    console.warn(`Cannot read directory ${node.uri}:`, err);
    return;
  }

  const children: IFolderStructure[] = dirents.map((dirent) => {
    const childPath = path.join(node.uri, dirent.name);
    return {
      name: dirent.name,
      uri: childPath,
      type: dirent.isDirectory() ? "folder" : "file",
      isRoot: false,
      children: [],
    } as IFolderStructure;
  });

  node.children = children;

  await Promise.all(
    node.children.map(async (child) => {
      if (child.type === "folder") {
        await fillChildren(child, currentDepth + 1, maxDepth);
      }
    })
  );
}

function sortChildrenRecursive(structure: IFolderStructure): void {
  structure.children.sort((a, b) => {
    if (a.type === "folder" && b.type === "file") return -1;
    if (a.type === "file" && b.type === "folder") return 1;
    return a.name.localeCompare(b.name);
  });

  for (const child of structure.children) {
    if (child.type === "folder") sortChildrenRecursive(child);
  }
}
