import { _context, context } from "./context.js";
import { commands } from "../../../workbench/common/command.js";
import { IExtensionModule } from "../../../workbench/workbench.types.js";

const fs = window.fs;
const path = window.path;

export class Extension {
  private _folder: string;
  private _extensions: IExtensionModule[] = [];

  constructor() {
    this._folder = path.join([path.__dirname, "..", "..", "..", "extensions"]);
  }

  async _load() {
    try {
      const files = await fs.readDir(this._folder);
      for (const file of files) {
        const fullPath = file;
        if (file.endsWith(".js")) {
          const fileUrl = window.url.pathToFileURL(fullPath);

          try {
            const module: IExtensionModule = await import(fileUrl);

            this._extensions.push(module);
            this._activate(module);
          } catch (error) {
            console.error("Error importing", fileUrl, error);
          }
        }
      }
    } catch (err) {
      console.error("Error reading extensions folder:", err);
    }
  }

  _activate(ext: IExtensionModule) {
    if (ext.activate) {
      ext.activate(_context);
    }
  }

  _execute(name: string) {
    if (commands.get(name)) {
      commands.get(name)!();
    } else {
    }
  }
}

export const _extensions = new Extension();
_extensions._load();

export { context };
