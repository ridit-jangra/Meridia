import { Type } from "@google/genai";
import { select } from "../store/selector";

const fs = window.fs;
const path = window.path;

let cwd: string;

setTimeout(() => {
  cwd = select((s) => s.main.folder_structure).uri;
}, 10);

export interface FileOperationResult {
  success: boolean;
  message: string;
  error?: string;
}

export const _fileTools = [
  {
    functionDeclarations: [
      {
        name: "createFile",
        description:
          "Creates a new file with the specified content relative to the current workspace",
        parameters: {
          type: Type.OBJECT,
          properties: {
            filePath: {
              type: Type.STRING,
              description:
                "The file path relative to the current workspace (or absolute path)",
            },
            content: {
              type: Type.STRING,
              description: "The content to write to the file",
            },
          },
          required: ["filePath", "content"],
        },
      },
      {
        name: "createFolder",
        description:
          "Creates a new folder/directory relative to the current workspace",
        parameters: {
          type: Type.OBJECT,
          properties: {
            folderPath: {
              type: Type.STRING,
              description:
                "The folder path relative to the current workspace (or absolute path)",
            },
          },
          required: ["folderPath"],
        },
      },
      {
        name: "deleteFile",
        description:
          "Deletes a specific file relative to the current workspace",
        parameters: {
          type: Type.OBJECT,
          properties: {
            filePath: {
              type: Type.STRING,
              description:
                "The file path relative to the current workspace (or absolute path)",
            },
          },
          required: ["filePath"],
        },
      },
      {
        name: "editFile",
        description:
          "Edits/overwrites the content of an existing file relative to the current workspace",
        parameters: {
          type: Type.OBJECT,
          properties: {
            filePath: {
              type: Type.STRING,
              description:
                "The file path relative to the current workspace (or absolute path)",
            },
            content: {
              type: Type.STRING,
              description: "The new content for the file",
            },
          },
          required: ["filePath", "content"],
        },
      },
      {
        name: "renameFile",
        description:
          "Renames or moves a file from one location to another relative to the current workspace",
        parameters: {
          type: Type.OBJECT,
          properties: {
            oldPath: {
              type: Type.STRING,
              description: "The current path of the file relative to workspace",
            },
            newPath: {
              type: Type.STRING,
              description:
                "The new path/name for the file relative to workspace",
            },
          },
          required: ["oldPath", "newPath"],
        },
      },
      {
        name: "moveFile",
        description:
          "Moves a file from one directory to another relative to the current workspace",
        parameters: {
          type: Type.OBJECT,
          properties: {
            sourcePath: {
              type: Type.STRING,
              description: "The current path of the file relative to workspace",
            },
            destinationPath: {
              type: Type.STRING,
              description:
                "The destination path for the file relative to workspace",
            },
          },
          required: ["sourcePath", "destinationPath"],
        },
      },
      {
        name: "removeFilesInFolder",
        description:
          "Removes all files within a specified folder relative to the current workspace",
        parameters: {
          type: Type.OBJECT,
          properties: {
            folderPath: {
              type: Type.STRING,
              description:
                "The path of the folder to clear of files relative to workspace",
            },
          },
          required: ["folderPath"],
        },
      },
      {
        name: "removeFolderRecursive",
        description:
          "Removes a folder and all its contents recursively relative to the current workspace",
        parameters: {
          type: Type.OBJECT,
          properties: {
            folderPath: {
              type: Type.STRING,
              description:
                "The path of the folder to remove recursively relative to workspace",
            },
          },
          required: ["folderPath"],
        },
      },
      {
        name: "openFile",
        description:
          "Opens a file and returns its content relative to the current workspace",
        parameters: {
          type: Type.OBJECT,
          properties: {
            filePath: {
              type: Type.STRING,
              description:
                "The file path relative to the current workspace (or absolute path)",
            },
          },
          required: ["filePath"],
        },
      },
      {
        name: "listDirectory",
        description:
          "Lists all files and folders in a directory relative to the current workspace",
        parameters: {
          type: Type.OBJECT,
          properties: {
            folderPath: {
              type: Type.STRING,
              description:
                "The path of the directory to list relative to workspace (or absolute path)",
            },
          },
          required: ["folderPath"],
        },
      },
    ],
  },
];

export class FileOperations {
  private _resolvePath(inputPath: string): string {
    if (path.isAbsolute && path.isAbsolute(inputPath)) {
      return inputPath;
    }

    return path.join([cwd, inputPath]);
  }

  private _normalizePath(inputPath: string): string {
    const resolved = this._resolvePath(inputPath);

    return resolved.replace(/[\\/]+/g, path.sep || "/");
  }

  public createFile(filePath: string, content: string): string {
    try {
      const normalizedPath = this._normalizePath(filePath);
      const dir = path.dirname(normalizedPath);

      if (!fs.exists(dir)) {
        fs.createFolder(dir);
      }

      fs.createFile(normalizedPath, content);

      const relativePath = this._getRelativePath(normalizedPath);
      return `File created successfully: ${relativePath}`;
    } catch (error) {
      throw new Error(`Failed to create file: ${error}`);
    }
  }

  public createFolder(folderPath: string): string {
    try {
      const normalizedPath = this._normalizePath(folderPath);
      fs.createFolder(normalizedPath);

      const relativePath = this._getRelativePath(normalizedPath);
      return `Folder created successfully: ${relativePath}`;
    } catch (error) {
      throw new Error(`Failed to create folder: ${error}`);
    }
  }

  public deleteFile(filePath: string): string {
    try {
      const normalizedPath = this._normalizePath(filePath);
      fs.deleteFile(normalizedPath);

      const relativePath = this._getRelativePath(normalizedPath);
      return `File deleted successfully: ${relativePath}`;
    } catch (error) {
      throw new Error(`Failed to delete file: ${error}`);
    }
  }

  public editFile(filePath: string, content: string): string {
    try {
      const normalizedPath = this._normalizePath(filePath);
      fs.createFile(normalizedPath, content);

      const relativePath = this._getRelativePath(normalizedPath);
      return `File edited successfully: ${relativePath}`;
    } catch (error) {
      throw new Error(`Failed to edit file: ${error}`);
    }
  }

  public renameFile(oldPath: string, newPath: string): string {
    try {
      const normalizedOldPath = this._normalizePath(oldPath);
      const normalizedNewPath = this._normalizePath(newPath);

      const newDir = path.dirname(normalizedNewPath);
      if (!fs.exists(newDir)) {
        fs.createFolder(newDir);
      }

      fs.rename(normalizedOldPath, normalizedNewPath);

      const relativeOldPath = this._getRelativePath(normalizedOldPath);
      const relativeNewPath = this._getRelativePath(normalizedNewPath);
      return `File renamed from ${relativeOldPath} to ${relativeNewPath}`;
    } catch (error) {
      throw new Error(`Failed to rename file: ${error}`);
    }
  }

  public moveFile(sourcePath: string, destinationPath: string): string {
    try {
      const normalizedSourcePath = this._normalizePath(sourcePath);
      const normalizedDestPath = this._normalizePath(destinationPath);

      const destDir = path.dirname(normalizedDestPath);
      if (!fs.exists(destDir)) {
        fs.createFolder(destDir);
      }

      fs.rename(normalizedSourcePath, normalizedDestPath);

      const relativeSourcePath = this._getRelativePath(normalizedSourcePath);
      const relativeDestPath = this._getRelativePath(normalizedDestPath);
      return `File moved from ${relativeSourcePath} to ${relativeDestPath}`;
    } catch (error) {
      throw new Error(`Failed to move file: ${error}`);
    }
  }

  public removeFilesInFolder(folderPath: string): string {
    try {
      const normalizedPath = this._normalizePath(folderPath);
      const files = fs.readDir(normalizedPath);
      let removedCount = 0;

      for (const file of files) {
        const filePath = path.join([normalizedPath, file]);
        const stat = fs.stat(filePath)!;

        if (stat.isFile()) {
          fs.deleteFile(filePath);
          removedCount++;
        }
      }

      const relativePath = this._getRelativePath(normalizedPath);
      return `Removed ${removedCount} files from folder: ${relativePath}`;
    } catch (error) {
      throw new Error(`Failed to remove files from folder: ${error}`);
    }
  }

  public removeFolderRecursive(folderPath: string): string {
    try {
      const normalizedPath = this._normalizePath(folderPath);
      fs.deleteFolder(normalizedPath);

      const relativePath = this._getRelativePath(normalizedPath);
      return `Folder removed recursively: ${relativePath}`;
    } catch (error) {
      throw new Error(`Failed to remove folder recursively: ${error}`);
    }
  }

  public openFile(filePath: string): { content: string; message: string } {
    try {
      const normalizedPath = this._normalizePath(filePath);
      const content = fs.readFile(normalizedPath, "utf8");

      const relativePath = this._getRelativePath(normalizedPath);
      return {
        content,
        message: `File opened: ${relativePath} (content length: ${content.length} characters)`,
      };
    } catch (error) {
      throw new Error(`Failed to open file: ${error}`);
    }
  }

  public listDirectory(folderPath: string): string[] {
    try {
      const normalizedPath = this._normalizePath(folderPath);
      return fs.readDir(normalizedPath);
    } catch (error) {
      throw new Error(`Failed to list directory: ${error}`);
    }
  }

  public getFileStats(filePath: string) {
    try {
      const normalizedPath = this._normalizePath(filePath);
      return fs.stat(normalizedPath);
    } catch (error) {
      throw new Error(`Failed to get file stats: ${error}`);
    }
  }

  public fileExists(filePath: string): boolean {
    const normalizedPath = this._normalizePath(filePath);
    return fs.exists(normalizedPath);
  }

  private _getRelativePath(absolutePath: string): string {
    if (absolutePath.startsWith(cwd)) {
      const relativePath = absolutePath.substring(cwd.length);
      return relativePath.startsWith("/") || relativePath.startsWith("\\")
        ? relativePath.substring(1)
        : relativePath;
    }
    return absolutePath;
  }
}
