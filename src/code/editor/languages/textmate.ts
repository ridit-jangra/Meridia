import { monaco } from "../editor.helper";
import {
  Registry,
  parseRawGrammar,
  INITIAL,
  type IGrammar,
  type StateStack,
} from "vscode-textmate";
import {
  loadWASM,
  createOnigScanner,
  createOnigString,
} from "vscode-oniguruma";

import onig_wasm_url from "vscode-oniguruma/release/onig.wasm?url";
import tsx_grammar_source from "./grammars/TypeScriptReact.tmLanguage?raw";

const LANGUAGE_SCOPE: Record<string, string> = {
  typescript: "source.tsx",
  javascript: "source.tsx",
};

const GRAMMAR_SOURCES: Record<string, string> = {
  "source.tsx": tsx_grammar_source,
};

let onig_promise: Promise<void> | null = null;

function load_oniguruma(): Promise<void> {
  if (!onig_promise) {
    onig_promise = fetch(onig_wasm_url)
      .then((res) => res.arrayBuffer())
      .then((buffer) => loadWASM(buffer));
  }
  return onig_promise;
}

function create_registry(): Registry {
  return new Registry({
    onigLib: load_oniguruma().then(() => ({
      createOnigScanner: (patterns: string[]) => createOnigScanner(patterns),
      createOnigString: (s: string) => createOnigString(s),
    })),
    loadGrammar: async (scope_name: string) => {
      const source = GRAMMAR_SOURCES[scope_name];
      if (!source) return null;
      return parseRawGrammar(source, `${scope_name}.tmLanguage`);
    },
  });
}

class tm_state implements monaco.languages.IState {
  constructor(public rule_stack: StateStack) {}
  clone(): monaco.languages.IState {
    return new tm_state(this.rule_stack);
  }
  equals(other: monaco.languages.IState): boolean {
    return (
      other === this ||
      (other instanceof tm_state && other.rule_stack === this.rule_stack)
    );
  }
}

function scope_to_token(scopes: string[]): string {
  for (let i = scopes.length - 1; i >= 0; i--) {
    const s = scopes[i];
    if (!s.startsWith("source.")) return s;
  }
  return "";
}

function make_tokens_provider(
  grammar: IGrammar,
): monaco.languages.TokensProvider {
  return {
    getInitialState: () => new tm_state(INITIAL),
    tokenize(line, state) {
      const result = grammar.tokenizeLine(
        line,
        (state as tm_state).rule_stack,
        500,
      );
      const tokens: monaco.languages.IToken[] = result.tokens.map((t) => ({
        startIndex: t.startIndex,
        scopes: scope_to_token(t.scopes),
      }));
      return { tokens, endState: new tm_state(result.ruleStack) };
    },
  };
}

let initialized = false;
const disposers: monaco.IDisposable[] = [];

export async function init_textmate(): Promise<void> {
  if (initialized) return;
  initialized = true;
  try {
    const registry = create_registry();
    for (const [language_id, scope_name] of Object.entries(LANGUAGE_SCOPE)) {
      const grammar = await registry.loadGrammar(scope_name);
      if (!grammar) continue;
      disposers.push(
        monaco.languages.setTokensProvider(
          language_id,
          make_tokens_provider(grammar),
        ),
      );
    }
  } catch (e) {
    console.error("[textmate] init failed", e);
    initialized = false;
  }
}

export function dispose_textmate(): void {
  for (const d of disposers) d.dispose();
  disposers.length = 0;
  initialized = false;
}
