import { app } from "electron";
import fs from "fs";
import path from "path";

class storage_service {
  private data: Record<string, any> = {};

  private readonly storage_file_path = path.join(
    app.getPath("userData"),
    "storage.json",
  );

  constructor() {
    this.ensure();
    this.load();
  }

  private ensure() {
    const dir = app.getPath("userData");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(this.storage_file_path))
      fs.writeFileSync(this.storage_file_path, "{}");
  }

  private load() {
    try {
      const raw = fs.readFileSync(this.storage_file_path, "utf-8");
      this.data = JSON.parse(raw || "{}") ?? {};
    } catch {
      this.data = {};
    }
  }

  private save() {
    const tmp = this.storage_file_path + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.storage_file_path);
  }

  get<T>(key: string, fallback?: T): T {
    return (this.data[key] ?? fallback) as T;
  }

  set(key: string, value: any) {
    this.data[key] = value;
    this.save();
  }

  update<T>(key: string, fn: (prev: T) => T, fallback?: T) {
    const prev = (this.data[key] ?? fallback) as T;
    this.data[key] = fn(prev);
    this.save();
  }

  remove(key: string) {
    delete this.data[key];
    this.save();
  }
}

export const storage = new storage_service();
