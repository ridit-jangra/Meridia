import { _context, context } from "./extension.context.js";
import { commands } from "../../../workbench/common/workbench.command.js";
import { IExtensionModule } from "../../../workbench/workbench.types.js";

const fs = window.fs;
const path = window.path;

export class Extension {
  private _folder: string;
  private _extensions: IExtensionModule[] = [];

  constructor() {
    this._folder = path.join([path.__dirname, "..", "..", "extensions"]);
  }

  async _load() {
    const files = fs.readDir(this._folder);
    files.forEach(async (file) => {
      if (file.endsWith(".js")) {
        const _path = path.join(["file:///", file]);
        try {
          const _module: IExtensionModule = await import(_path);
          this._extensions.push(_module);
          this._activate();
        } catch (error) {}
      }
    });
  }

  _activate() {
    this._extensions.forEach((ext) => {
      if (ext.activate) {
        ext.activate(_context);
      }
    });
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

console.log(path.join([path.__dirname, "..", "..", "extensions"]));
