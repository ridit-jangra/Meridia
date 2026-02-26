export const norm = (p: string): string => p.replace(/\\/g, "/");

export const get_drive = (p: string): string => {
  const match = norm(p).match(/^([A-Za-z]:)\//);
  return match ? match[1] : "";
};

export const path_parts = (p: string): string[] =>
  norm(p)
    .replace(/^[A-Za-z]:\//, "")
    .split("/")
    .filter(Boolean);

export const join_path = (drive: string, parts: string[]): string =>
  drive ? `${drive}/${parts.join("/")}` : parts.join("/");

export function generate_uri(raw_path: string): string {
  return norm(raw_path).replace(/\/$/, "");
}

export function generate_child_uri(parent_uri: string, name: string): string {
  const normalized = norm(parent_uri).replace(/\/$/, "");
  return `${normalized}/${name}`;
}

export function get_parent_uri(uri: string): string {
  const normalized = norm(uri).replace(/\/$/, "");
  const drive = get_drive(normalized);
  const parts = path_parts(normalized);
  parts.pop();

  if (parts.length === 0) return drive ? `${drive}/` : "/";
  return join_path(drive, parts);
}

export function get_basename(uri: string): string {
  const parts = path_parts(uri);
  return parts[parts.length - 1] ?? "";
}

export function get_ext(uri: string): string {
  const base = get_basename(uri);
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot) : "";
}

export function get_stem(uri: string): string {
  const base = get_basename(uri);
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(0, dot) : base;
}

export function uris_equal(a: string, b: string): boolean {
  const na = norm(a).replace(/\/$/, "");
  const nb = norm(b).replace(/\/$/, "");
  // Windows paths are case-insensitive
  if (get_drive(na) || get_drive(nb)) {
    return na.toLowerCase() === nb.toLowerCase();
  }
  return na === nb;
}

export function is_descendant_of(uri: string, parent_uri: string): boolean {
  const na = norm(uri).replace(/\/$/, "");
  const nb = norm(parent_uri).replace(/\/$/, "");
  return na.startsWith(nb + "/");
}

export function is_direct_child(uri: string, parent_uri: string): boolean {
  if (!is_descendant_of(uri, parent_uri)) return false;
  const na = norm(uri).replace(/\/$/, "");
  const nb = norm(parent_uri).replace(/\/$/, "");
  const remainder = na.slice(nb.length + 1);
  return !remainder.includes("/");
}

export function rebase_uri(
  uri: string,
  old_parent: string,
  new_parent: string,
): string {
  const na = norm(uri).replace(/\/$/, "");
  const nb = norm(old_parent).replace(/\/$/, "");
  const nc = norm(new_parent).replace(/\/$/, "");

  if (!na.startsWith(nb)) return uri;
  return nc + na.slice(nb.length);
}
