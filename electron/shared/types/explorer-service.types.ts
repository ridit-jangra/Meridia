export type TWatchEvent =
  | { type: "add" | "remove" | "change"; path: string; isDir: boolean }
  | { type: "rename"; from: string; to: string; isDir: boolean };
