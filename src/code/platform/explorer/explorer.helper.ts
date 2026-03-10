export function get_file_icon(_name: string) {
  let _ext: string;

  const dot_count = (_name.match(/\./g) || []).length;

  const specific_patterns = [".d.ts"];
  const has_specific_pattern = specific_patterns.some((pattern) =>
    _name.endsWith(pattern),
  );

  if (dot_count >= 2 && has_specific_pattern) {
    const first_dot_index = _name.indexOf(".");
    _ext = _name.substring(first_dot_index + 1).toLowerCase();
  } else {
    _ext = (_name.split(".").pop() || "").toLowerCase();
  }

  const supported = [
    "ts",
    "js",
    "py",
    "html",
    "json",
    "mjs",
    "mts",
    "cjs",
    "cts",
    "md",
    "gitignore",
    "gitattributes",
    "otf",
    "ttf",
    "woff",
    "woff2",
    "svg",
    "xls",
    "xlsx",
    "toml",
    "d",
    "rs",
    "iss",
    "license",
    "readme",
    "prettierrc",
    "prettierignore",
    "env",
    "png",
    "jpg",
    "jpeg",
    "ico",
    "css",
    "sh",
    "d.ts",
    "docx",
    "doc",
    "pdf",
    "jsx",
    "tsx",
    "csv",
    "wav",
    "mp3",
    "pyi",
    "map",
    "ipynb",
    "yaml",
    "xml",
  ];

  const icon_name = supported.includes(_ext) ? _ext : "default";

  const icon_path = `file.type.${icon_name}.svg`;

  return icon_path;
}

export function join_path(...segments: string[]): string {
  if (segments.length === 0) return "";

  const filtered = segments.filter((s) => s !== "");
  if (filtered.length === 0) return "";

  let joined = filtered.join("/");

  joined = joined.replace(/\/+/g, "/");

  if (joined.length > 1 && joined.endsWith("/")) {
    joined = joined.slice(0, -1);
  }

  if (segments[0].startsWith("/") && !joined.startsWith("/")) {
    joined = "/" + joined;
  }

  return joined;
}

export function get_dir_name(path: string): string {
  if (!path || path === "/") return "/";

  const normalized = path.replace(/\/+$/, "");

  const lastSlashIndex = normalized.lastIndexOf("/");

  if (lastSlashIndex === -1) return ".";
  if (lastSlashIndex === 0) return "/";

  return normalized.substring(0, lastSlashIndex);
}

export function get_base_name(p: string): string {
  if (!p) return "";

  const normalized = p.replace(/[\\/]+$/, "");
  const parts = normalized.split(/[\\/]/);

  return parts[parts.length - 1] || "";
}
