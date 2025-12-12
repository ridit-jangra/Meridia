import { _context, context } from "./context.js";
import { commands } from "../../../workbench/common/command.js";
import {
  IExtension,
  IExtensionModule,
} from "../../../workbench/workbench.types.js";

const fs = window.fs;
const path = window.path;

export class Extension {
  private _folder: string;
  private _extensionsModules: IExtensionModule[] = [];
  public _extensions: IExtension[] = [];

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
          const manifestPath = path.join([
            path.dirname(fullPath),
            "manifest.json",
          ]);

          try {
            const manifestRaw = await fs.readFile(manifestPath, "utf-8");
            const manifestContent = JSON.parse(manifestRaw) as IExtension;
            this._extensions.push(manifestContent);
          } catch (err) {}

          try {
            const module: IExtensionModule = await import(fileUrl);

            this._extensionsModules.push(module);
            this._activate(module);
          } catch (error) {}
        }
      }
    } catch (err) {}
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
