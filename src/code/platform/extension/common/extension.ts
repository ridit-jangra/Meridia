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
          } catch (error) {
            console.error("extension loading manifest error", error);
          }

          try {
            const module: IExtensionModule = await import(fileUrl);
            this._extensionsModules.push(module);
            this._activate(module);
          } catch (error) {
            console.error("extension running error", error);
          }
        }
      }
    } catch (err) {
      console.error("extension load error", err);
    }
  }

  _activate(ext: IExtensionModule) {
    if (ext.activate) {
      ext.activate(_context);
    }
  }

  _deactivate(ext: IExtensionModule) {
    if (ext.deactivate) {
      ext.deactivate(_context);
    }
  }

  _execute(name: string) {
    if (commands.get(name)) {
      commands.get(name)!();
    }
  }

  async restart() {
    console.log("restarting");
    this._extensionsModules.forEach((module) => {
      this._deactivate(module);
    });

    this._extensions = [];
    this._extensionsModules = [];

    await this._load();
  }
}

export const _extensions = new Extension();
_extensions._load();

export { context };
