import * as cp from "node:child_process";
import { existsSync } from "node:fs";
import * as path from "node:path";

function is_windows_store_stub(p: string): boolean {
  return p.toLowerCase().includes("windowsapps");
}

export function resolve_python(): string | null {
  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA ?? "";
    const candidates: string[] = [];
    for (const v of ["314", "313", "312", "311", "310", "39", "38"]) {
      candidates.push(`C:\\Python${v}\\python.exe`);
      candidates.push(
        `${localAppData}\\Programs\\Python\\Python${v}\\python.exe`,
      );
    }
    for (const p of candidates) {
      if (!p || !existsSync(p) || is_windows_store_stub(p)) continue;
      const ok = cp.spawnSync(p, ["--version"], {
        encoding: "utf8",
        timeout: 3000,
      });
      if (ok.status === 0) {
        console.log(
          `[LSP-BRIDGE] Found Python at "${p}": ${(ok.stdout || ok.stderr).trim()}`,
        );
        return p;
      }
    }
  }

  const bins =
    process.platform === "win32"
      ? ["python.exe", "python3.exe"]
      : ["python3", "python"];
  for (const bin of bins) {
    try {
      const which = cp.spawnSync(
        process.platform === "win32" ? "where" : "which",
        [bin],
        { encoding: "utf8", timeout: 3000 },
      );
      if (which.status !== 0) continue;
      for (const line of which.stdout
        .trim()
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)) {
        if (is_windows_store_stub(line)) continue;
        const ver = cp.spawnSync(line, ["--version"], {
          encoding: "utf8",
          timeout: 3000,
        });
        if (ver.status === 0) {
          console.log(
            `[LSP-BRIDGE] Found Python "${line}": ${(ver.stdout || ver.stderr).trim()}`,
          );
          return line;
        }
      }
    } catch {}
  }

  console.warn("[LSP-BRIDGE] No Python found");
  return null;
}

export function resolve_pylsp(
  pythonPath: string,
): { command: string; args: string[] } | null {
  const dir = path.dirname(pythonPath);
  const exe_candidates =
    process.platform === "win32"
      ? [
          path.join(dir, "Scripts", "pylsp.exe"),
          path.join(dir, "Scripts", "pylsp"),
        ]
      : [path.join(dir, "pylsp"), path.join(path.dirname(dir), "bin", "pylsp")];

  for (const p of exe_candidates) {
    if (existsSync(p)) {
      console.log(`[LSP-BRIDGE] Found pylsp at "${p}"`);
      return { command: p, args: [] };
    }
  }

  const mod = cp.spawnSync(pythonPath, ["-m", "pylsp", "--version"], {
    encoding: "utf8",
    timeout: 5000,
  });
  if (mod.status === 0) return { command: pythonPath, args: ["-m", "pylsp"] };

  console.error(
    `[LSP-BRIDGE] pylsp not found — run: "${pythonPath}" -m pip install python-lsp-server`,
  );
  return null;
}

export function resolve_node_bin(appRoot: string): string {
  const candidates = [
    path.join(
      path.dirname(process.execPath),
      process.platform === "win32" ? "node.exe" : "node",
    ),
    path.join(
      appRoot,
      "node_modules",
      ".bin",
      process.platform === "win32" ? "node.exe" : "node",
    ),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return process.platform === "win32" ? "node.exe" : "node";
}
