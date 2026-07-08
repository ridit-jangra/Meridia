import { monaco, path_to_language } from "../editor.helper";
import { uri_to_path } from "./utils";
import type { Client } from "./client";
import {
  LSP_AGENT_REQUEST,
  LSP_AGENT_RESPONSE,
} from "../../../../shared/ipc/channels";

interface AgentLspRequest {
  id: string;
  op: "diagnostics" | "hover" | "definition" | "references" | "symbols";
  path: string;
  line?: number;
  column?: number;
}

const MARKER_SEVERITY: Record<number, string> = {
  8: "error",
  4: "warning",
  2: "info",
  1: "hint",
};

const SYMBOL_KIND: Record<number, string> = {
  1: "file",
  2: "module",
  3: "namespace",
  4: "package",
  5: "class",
  6: "method",
  7: "property",
  8: "field",
  9: "constructor",
  10: "enum",
  11: "interface",
  12: "function",
  13: "variable",
  14: "constant",
  15: "string",
  16: "number",
  17: "boolean",
  18: "array",
  19: "object",
  20: "key",
  21: "null",
  22: "enum-member",
  23: "struct",
  24: "event",
  25: "operator",
  26: "type-parameter",
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function hover_text(hover: unknown): string | null {
  const h = hover as { contents?: unknown } | null;
  if (!h?.contents) return null;
  const c = h.contents;
  if (typeof c === "string") return c;
  if (Array.isArray(c))
    return c
      .map((x) => (typeof x === "string" ? x : (x as { value?: string }).value))
      .filter(Boolean)
      .join("\n");
  return (c as { value?: string }).value ?? null;
}

function normalize_locations(
  res: unknown,
): { path: string; line: number; column: number }[] {
  if (!res) return [];
  const arr = Array.isArray(res) ? res : [res];
  const out: { path: string; line: number; column: number }[] = [];
  for (const item of arr) {
    const loc = item as Record<string, any>;
    const uri = loc.uri ?? loc.targetUri;
    const range = loc.range ?? loc.targetSelectionRange ?? loc.targetRange;
    if (!uri || !range) continue;
    out.push({
      path: uri_to_path(uri),
      line: range.start.line + 1,
      column: range.start.character + 1,
    });
  }
  return out;
}

function flatten_symbols(
  syms: unknown,
  depth = 0,
  out: {
    name: string;
    kind: string;
    line: number | null;
    depth: number;
  }[] = [],
): { name: string; kind: string; line: number | null; depth: number }[] {
  if (!Array.isArray(syms)) return out;
  for (const raw of syms) {
    const s = raw as Record<string, any>;
    const range = s.range ?? s.location?.range;
    out.push({
      name: s.name,
      kind: SYMBOL_KIND[s.kind as number] ?? String(s.kind),
      line: range ? range.start.line + 1 : null,
      depth,
    });
    if (Array.isArray(s.children) && s.children.length)
      flatten_symbols(s.children, depth + 1, out);
  }
  return out;
}

export function init_agent_lsp_bridge(client: Client): void {
  window.ipc.on(LSP_AGENT_REQUEST, async (_evt, req: AgentLspRequest) => {
    const reply = (payload: {
      ok: boolean;
      result?: unknown;
      error?: string;
    }) => window.ipc.send(LSP_AGENT_RESPONSE, { id: req.id, ...payload });

    try {
      const uri = monaco.Uri.file(req.path);
      let model = monaco.editor.getModel(uri);
      let created = false;

      if (!model) {
        const content = await window.files.read_file_text(req.path);
        model = monaco.editor.createModel(
          content,
          path_to_language(req.path),
          uri,
        );
        created = true;
      }

      // A freshly created model was just handed to the server via didOpen; give
      // it a moment to attach / analyze before we ask anything about it.
      // Diagnostics are push-based (publishDiagnostics) so they need longer than
      // a request/response query before markers are populated.
      if (created) await delay(req.op === "diagnostics" ? 2500 : 1200);

      const position = {
        line: Math.max(0, (req.line ?? 1) - 1),
        character: Math.max(0, (req.column ?? 1) - 1),
      };

      switch (req.op) {
        case "diagnostics": {
          const markers = monaco.editor.getModelMarkers({ resource: uri });
          reply({
            ok: true,
            result: markers.map((m) => ({
              severity: MARKER_SEVERITY[m.severity] ?? String(m.severity),
              message: m.message,
              source: m.source,
              line: m.startLineNumber,
              column: m.startColumn,
              endLine: m.endLineNumber,
              endColumn: m.endColumn,
            })),
          });
          break;
        }
        case "hover": {
          const hover = await client.lsp_hover(model, position);
          reply({ ok: true, result: hover_text(hover) });
          break;
        }
        case "definition": {
          const res = await client.lsp_definition(model, position);
          reply({ ok: true, result: normalize_locations(res) });
          break;
        }
        case "references": {
          const res = await client.lsp_references(model, position);
          reply({ ok: true, result: normalize_locations(res) });
          break;
        }
        case "symbols": {
          const res = await client.lsp_document_symbols(model);
          reply({ ok: true, result: flatten_symbols(res) });
          break;
        }
        default:
          reply({ ok: false, error: `unknown op: ${req.op}` });
      }
    } catch (e) {
      reply({ ok: false, error: (e as Error)?.message ?? String(e) });
    }
  });
}
