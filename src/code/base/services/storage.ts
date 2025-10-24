import fs from "fs";
import { ipcMain } from "electron";
import { registerStandalone } from "../../workbench/common/standalone";
import { STORE_JSON_PATH } from "../common/utils";

export class Storage {
  private static data: Record<string, any>;

  static {
    this.load();
  }

  private static load() {
    try {
      if (fs.existsSync(STORE_JSON_PATH)) {
        const content = fs.readFileSync(STORE_JSON_PATH, "utf-8");
        this.data = JSON.parse(content);
      } else {
        this.data = {};
        this.save(this.data);
      }
    } catch {
      this.data = {};
    }
  }

  private static save(data: Record<string, any>) {
    try {
      this.data = data;
      fs.writeFileSync(STORE_JSON_PATH, JSON.stringify(data, null, 2), "utf-8");
    } catch {}
  }

  public static get<T = any>(key: string) {
    return this.data[key] ?? null;
  }

  public static store(key: string, value: any) {
    this.data[key] = value;
    this.save(this.data);
  }

  public static update(key: string, newValue: any) {
    if (key in this.data) {
      this.data[key] = newValue;
      this.save(this.data);
    }
  }

  public static remove(key: string) {
    this.data[key] = "";
    this.save(this.data);
  }
}

const _storage = new Storage();

registerStandalone("storage", _storage);
