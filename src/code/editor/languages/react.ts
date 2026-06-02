import { monaco } from "../editor.helper";

type Snippet = {
  label: string;
  detail: string;
  insert: string;
  trigger_chars?: string[];
};

const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

const COMMON_TAGS = [
  "div",
  "span",
  "p",
  "a",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "section",
  "article",
  "aside",
  "header",
  "footer",
  "main",
  "nav",
  "form",
  "input",
  "button",
  "label",
  "select",
  "option",
  "textarea",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "img",
  "video",
  "audio",
  "source",
  "canvas",
  "svg",
  "path",
  "details",
  "summary",
  "dialog",
  "fragment",
];

function is_react_file(model: monaco.editor.ITextModel): boolean {
  return /\.(tsx|jsx)$/.test(model.uri.path);
}

function build_snippets(): Snippet[] {
  const snippets: Snippet[] = [
    {
      label: "rfc",
      detail: "React function component",
      insert: [
        "function ${1:Component}() {",
        "\treturn (",
        "\t\t<div>$0</div>",
        "\t);",
        "}",
        "",
        "export default ${1:Component};",
      ].join("\n"),
    },
    {
      label: "rafce",
      detail: "Arrow function component + export",
      insert: [
        "const ${1:Component} = () => {",
        "\treturn (",
        "\t\t<div>$0</div>",
        "\t);",
        "};",
        "",
        "export default ${1:Component};",
      ].join("\n"),
    },
    {
      label: "useState",
      detail: "useState hook",
      insert:
        "const [${1:state}, set${2:State}] = useState(${3:initialValue});$0",
    },
    {
      label: "useEffect",
      detail: "useEffect hook",
      insert: "useEffect(() => {\n\t$0\n}, [${1}]);",
    },
    {
      label: "useRef",
      detail: "useRef hook",
      insert: "const ${1:ref} = useRef(${2:null});$0",
    },
    {
      label: "useMemo",
      detail: "useMemo hook",
      insert: "const ${1:value} = useMemo(() => {\n\treturn $0;\n}, [${2}]);",
    },
    {
      label: "useCallback",
      detail: "useCallback hook",
      insert: "const ${1:fn} = useCallback(() => {\n\t$0\n}, [${2}]);",
    },
    {
      label: "useContext",
      detail: "useContext hook",
      insert: "const ${1:value} = useContext(${2:Context});$0",
    },
    {
      label: "useReducer",
      detail: "useReducer hook",
      insert:
        "const [${1:state}, dispatch] = useReducer(${2:reducer}, ${3:initialState});$0",
    },
    {
      label: "frag",
      detail: "Fragment <>...</>",
      insert: "<>\n\t$0\n</>",
    },
  ];

  for (const tag of COMMON_TAGS) {
    if (snippets.some((s) => s.label === tag)) continue;
    if (tag === "fragment") {
      snippets.push({
        label: "fragment",
        detail: "<React.Fragment>",
        insert: "<React.Fragment>$1</React.Fragment>$0",
      });
      continue;
    }
    snippets.push({
      label: tag,
      detail: `<${tag}>`,
      insert: VOID_TAGS.has(tag) ? `<${tag} $1 />$0` : `<${tag}>$1</${tag}>$0`,
    });
  }

  return snippets;
}

function parse_abbreviation(
  word_before: string,
): { tag: string; cls?: string; id?: string } | null {
  const m = word_before.match(
    /^([a-zA-Z][a-zA-Z0-9]*)?(?:\.([a-zA-Z0-9_-]+))?(?:#([a-zA-Z0-9_-]+))?$/,
  );
  if (!m) return null;
  const [, tag, cls, id] = m;
  if (!tag && !cls && !id) return null;
  return { tag: tag ?? "div", cls, id };
}

function abbr_to_snippet(tag: string, cls?: string, id?: string): string {
  const attrs = [cls ? `className="${cls}"` : "", id ? `id="${id}"` : ""]
    .filter(Boolean)
    .join(" ");
  const attr_str = attrs ? " " + attrs : "";
  return VOID_TAGS.has(tag)
    ? `<${tag}${attr_str} />$0`
    : `<${tag}${attr_str}>$1</${tag}>$0`;
}

export function register_react_language(): monaco.IDisposable {
  const snippets = build_snippets();

  return monaco.languages.registerCompletionItemProvider(
    ["typescript", "javascript"],
    {
      triggerCharacters: [".", "#", "<"],

      provideCompletionItems(
        model: monaco.editor.ITextModel,
        position: monaco.Position,
      ): monaco.languages.CompletionList {
        if (!is_react_file(model)) return { suggestions: [] };

        const line = model.getLineContent(position.lineNumber);
        const text_before = line.substring(0, position.column - 1);

        const token_match = text_before.match(/[#.\w-]+$/);
        const token = token_match?.[0] ?? "";

        const range: monaco.IRange = {
          startLineNumber: position.lineNumber,
          startColumn: position.column - token.length,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        };

        const items: monaco.languages.CompletionItem[] = [];

        for (const s of snippets) {
          items.push({
            label: s.label,
            detail: s.detail,
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: s.insert,
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            sortText: "9_" + s.label,
          });
        }

        if (token && (token.includes(".") || token.includes("#"))) {
          const abbr = parse_abbreviation(token);

          if (abbr) {
            const snippet = abbr_to_snippet(abbr.tag, abbr.cls, abbr.id);

            items.push({
              label: token,
              detail: `Expand: ${snippet
                .replace(/\$\d+/g, "")
                .replace(/\$\{[^}]+\}/g, "")}`,
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: snippet,
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
              sortText: "0_emmet",
              preselect: true,
            });
          }
        }

        return { suggestions: items };
      },
    },
  );
}

export function setup_react_auto_close(
  editor: monaco.editor.IStandaloneCodeEditor,
): monaco.IDisposable {
  return editor.onDidChangeModelContent(
    (e: monaco.editor.IModelContentChangedEvent) => {
      if (e.changes.length !== 1) return;
      const change = e.changes[0];
      if (change.text !== ">") return;

      const model = editor.getModel();
      if (!model) return;
      if (!is_react_file(model)) return;

      const position = editor.getPosition();
      if (!position) return;

      const line = model.getLineContent(position.lineNumber);
      const text_up_to_cursor = line.substring(0, position.column - 1);

      const tag_match = text_up_to_cursor.match(
        /<([A-Za-z][\w.]*)(?:\s[^<>]*)?\s*$/,
      );
      if (!tag_match) return;

      const tag_name = tag_match[1];

      if (VOID_TAGS.has(tag_name.toLowerCase())) return;

      if (text_up_to_cursor.trimEnd().endsWith("/")) return;

      const closing_tag = `</${tag_name}>`;
      const insert_position = {
        lineNumber: position.lineNumber,
        column: position.column,
      };

      editor.executeEdits("auto-close-jsx-tag", [
        {
          range: new monaco.Range(
            insert_position.lineNumber,
            insert_position.column,
            insert_position.lineNumber,
            insert_position.column,
          ),
          text: closing_tag,
          forceMoveMarkers: false,
        },
      ]);

      editor.setPosition(insert_position);
    },
  );
}
