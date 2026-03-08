

const norm_key = (k: string) => {
  const t = k.trim().toLowerCase();
  if (t === "cmd") return "meta";
  if (t === "command") return "meta";
  if (t === "control") return "ctrl";
  if (t === "escape") return "esc";
  if (t === " ") return "space";
  return t;
};

export const normalize_combo = (combo: string) => {
  const parts = combo.split("+").map(norm_key).filter(Boolean);

  const mods = new Set<string>();
  let key = "";

  for (const p of parts) {
    if (p === "ctrl" || p === "meta" || p === "alt" || p === "shift")
      mods.add(p);
    else key = p;
  }

  const ordered = ["ctrl", "meta", "alt", "shift"].filter((m) => mods.has(m));
  return [...ordered, key].filter(Boolean).join("+");
};

export const normalize_chord = (keys: string) =>
  keys
    .split(" ")
    .map((c) => c.trim())
    .filter(Boolean)
    .map(normalize_combo)
    .join(" ");

export const event_combo = (e: KeyboardEvent) => {
  const mods: string[] = [];
  if (e.ctrlKey) mods.push("ctrl");
  if (e.metaKey) mods.push("meta");
  if (e.altKey) mods.push("alt");
  if (e.shiftKey) mods.push("shift");

  const k = norm_key(e.key.length === 1 ? e.key : e.key);
  return normalize_combo([...mods, k].join("+"));
};