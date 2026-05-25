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
  "script",
  "style",
  "link",
  "meta",
  "canvas",
  "svg",
  "path",
  "details",
  "summary",
  "dialog",
  "template",
  "slot",
];

// function wrap(tag: string, inner = "$1"): string {
//   return VOID_TAGS.has(tag)
//     ? `<${tag} ${inner} />`
//     : `<${tag}>${inner}</${tag}>`;
// }

function build_snippets(): Snippet[] {
  const snippets: Snippet[] = [
    {
      label: "!",
      detail: "HTML5 boilerplate",
      trigger_chars: ["!"],
      insert: [
        "<!DOCTYPE html>",
        '<html lang="${1:en}">',
        "<head>",
        '\t<meta charset="UTF-8" />',
        '\t<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
        "\t<title>${2:Document}</title>",
        "</head>",
        "<body>",
        "\t$0",
        "</body>",
        "</html>",
      ].join("\n"),
    },

    {
      label: ".cls",
      detail: '<div class="cls">',
      trigger_chars: ["."],
      insert: '<div class="${1:class-name}">$2</div>$0',
    },
    {
      label: "#id",
      detail: '<div id="id">',
      trigger_chars: ["#"],
      insert: '<div id="${1:id}">$2</div>$0',
    },

    {
      label: "link:css",
      detail: "CSS stylesheet link",
      insert: '<link rel="stylesheet" href="${1:style.css}" />$0',
    },
    {
      label: "link:favicon",
      detail: "Favicon link",
      insert: '<link rel="icon" type="image/png" href="${1:favicon.png}" />$0',
    },
    {
      label: "script:src",
      detail: "External script",
      insert: '<script src="${1:app.js}" defer></script>$0',
    },
    {
      label: "script:module",
      detail: "ES module script",
      insert: '<script type="module" src="${1:app.js}"></script>$0',
    },

    {
      label: "meta:charset",
      detail: '<meta charset="UTF-8">',
      insert: '<meta charset="${1:UTF-8}" />$0',
    },
    {
      label: "meta:viewport",
      detail: "Responsive viewport meta",
      insert:
        '<meta name="viewport" content="width=device-width, initial-scale=1.0" />$0',
    },
    {
      label: "meta:desc",
      detail: "Meta description",
      insert: '<meta name="description" content="${1}" />$0',
    },
    {
      label: "meta:og",
      detail: "Open Graph meta set",
      insert: [
        '<meta property="og:title" content="${1:Title}" />',
        '<meta property="og:description" content="${2:Description}" />',
        '<meta property="og:image" content="${3:image.png}" />',
        '<meta property="og:url" content="${4:https://example.com}" />$0',
      ].join("\n"),
    },

    {
      label: "form",
      detail: "Form with action & method",
      insert: [
        '<form action="${1:#}" method="${2:post}">',
        "\t$0",
        "</form>",
      ].join("\n"),
    },
    {
      label: "inp",
      detail: "Input field",
      insert:
        '<input type="${1:text}" id="${2}" name="${2}" placeholder="${3}" />$0',
    },
    {
      label: "inp:email",
      detail: "Email input",
      insert:
        '<input type="email" id="${1:email}" name="${1:email}" placeholder="${2:Email}" required />$0',
    },
    {
      label: "inp:pass",
      detail: "Password input",
      insert:
        '<input type="password" id="${1:password}" name="${1:password}" placeholder="${2:Password}" required />$0',
    },
    {
      label: "inp:check",
      detail: "Checkbox input",
      insert:
        '<input type="checkbox" id="${1:check}" name="${1:check}" value="${2}" />$0',
    },
    {
      label: "inp:radio",
      detail: "Radio input",
      insert:
        '<input type="radio" id="${1:radio}" name="${2:group}" value="${3}" />$0',
    },
    {
      label: "inp:file",
      detail: "File input",
      insert:
        '<input type="file" id="${1:file}" name="${1:file}" accept="${2:*}" />$0',
    },
    {
      label: "label",
      detail: "Label for input",
      insert: '<label for="${1:id}">${2:Label}</label>$0',
    },
    {
      label: "select",
      detail: "Select dropdown",
      insert: [
        '<select id="${1:name}" name="${1:name}">',
        '\t<option value="${2:value}">${3:Option}</option>',
        "\t$0",
        "</select>",
      ].join("\n"),
    },
    {
      label: "textarea",
      detail: "Textarea",
      insert:
        '<textarea id="${1:name}" name="${1:name}" rows="${2:4}" placeholder="${3}">$0</textarea>',
    },
    {
      label: "btn",
      detail: "Button element",
      insert: '<button type="${1:button}">${2:Click me}</button>$0',
    },
    {
      label: "btn:submit",
      detail: "Submit button",
      insert: '<button type="submit">${1:Submit}</button>$0',
    },

    {
      label: "img",
      detail: "Image with alt",
      insert: '<img src="${1:image.png}" alt="${2:description}" />$0',
    },
    {
      label: "img:lazy",
      detail: "Lazy-loaded image",
      insert:
        '<img src="${1:image.png}" alt="${2:description}" loading="lazy" />$0',
    },
    {
      label: "video",
      detail: "Video element",
      insert: [
        '<video src="${1:video.mp4}" controls${2: autoplay muted loop}>',
        "\t${3:Your browser does not support video.}",
        "</video>$0",
      ].join("\n"),
    },
    {
      label: "audio",
      detail: "Audio element",
      insert: '<audio src="${1:audio.mp3}" controls></audio>$0',
    },
    {
      label: "picture",
      detail: "Responsive picture element",
      insert: [
        "<picture>",
        '\t<source srcset="${1:image.webp}" type="image/webp" />',
        '\t<img src="${2:image.jpg}" alt="${3:description}" />',
        "</picture>$0",
      ].join("\n"),
    },
    {
      label: "iframe",
      detail: "Iframe embed",
      insert:
        '<iframe src="${1:https://example.com}" title="${2}" width="${3:600}" height="${4:400}" loading="lazy"></iframe>$0',
    },

    {
      label: "flexbox",
      detail: "Flex container div",
      insert:
        '<div style="display:flex; gap:${1:1rem}; align-items:${2:center};">\n\t$0\n</div>',
    },
    {
      label: "grid",
      detail: "Grid container div",
      insert:
        '<div style="display:grid; grid-template-columns:${1:repeat(3,1fr)}; gap:${2:1rem};">\n\t$0\n</div>',
    },

    {
      label: "header",
      detail: "<header>",
      insert: "<header>\n\t$0\n</header>",
    },
    {
      label: "nav",
      detail: "<nav>",
      insert: "<nav>\n\t$0\n</nav>",
    },
    {
      label: "main",
      detail: "<main>",
      insert: "<main>\n\t$0\n</main>",
    },
    {
      label: "section",
      detail: "<section>",
      insert: '<section id="${1}">\n\t$0\n</section>',
    },
    {
      label: "article",
      detail: "<article>",
      insert: "<article>\n\t$0\n</article>",
    },
    {
      label: "aside",
      detail: "<aside>",
      insert: "<aside>\n\t$0\n</aside>",
    },
    {
      label: "footer",
      detail: "<footer>",
      insert: "<footer>\n\t$0\n</footer>",
    },
    {
      label: "dialog",
      detail: "<dialog>",
      insert: '<dialog id="${1}">\n\t$0\n</dialog>',
    },
    {
      label: "details",
      detail: "<details> + <summary>",
      insert: "<details>\n\t<summary>${1:Toggle}</summary>\n\t$0\n</details>",
    },

    {
      label: "table",
      detail: "Full table skeleton",
      insert: [
        "<table>",
        "\t<thead>",
        "\t\t<tr>",
        "\t\t\t<th>${1:Header}</th>",
        "\t\t</tr>",
        "\t</thead>",
        "\t<tbody>",
        "\t\t<tr>",
        "\t\t\t<td>${2:Data}</td>",
        "\t\t</tr>",
        "\t</tbody>",
        "</table>$0",
      ].join("\n"),
    },

    {
      label: "a",
      detail: "Anchor link",
      insert: '<a href="${1:#}">${2:Link text}</a>$0',
    },
    {
      label: "a:blank",
      detail: "External link (target=_blank)",
      insert:
        '<a href="${1:https://example.com}" target="_blank" rel="noopener noreferrer">${2:Link}</a>$0',
    },
    {
      label: "a:mail",
      detail: "Mailto link",
      insert: '<a href="mailto:${1:email@example.com}">${2:Email us}</a>$0',
    },
    {
      label: "a:tel",
      detail: "Tel link",
      insert: '<a href="tel:${1:+10000000000}">${2:Call us}</a>$0',
    },

    {
      label: "ul",
      detail: "Unordered list",
      insert: "<ul>\n\t<li>${1:Item}</li>\n\t$0\n</ul>",
    },
    {
      label: "ol",
      detail: "Ordered list",
      insert: "<ol>\n\t<li>${1:Item}</li>\n\t$0\n</ol>",
    },
    {
      label: "dl",
      detail: "Description list",
      insert:
        "<dl>\n\t<dt>${1:Term}</dt>\n\t<dd>${2:Description}</dd>\n\t$0\n</dl>",
    },
  ];

  for (const tag of COMMON_TAGS) {
    if (snippets.some((s) => s.label === tag)) continue;
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
  if (VOID_TAGS.has(tag)) {
    const attrs = [cls ? `class="${cls}"` : "", id ? `id="${id}"` : ""]
      .filter(Boolean)
      .join(" ");
    return `<${tag}${attrs ? " " + attrs : ""} />$0`;
  }
  const attrs = [cls ? `class="${cls}"` : "", id ? `id="${id}"` : ""]
    .filter(Boolean)
    .join(" ");
  return `<${tag}${attrs ? " " + attrs : ""}>$1</${tag}>$0`;
}

export function register_html_language(): monaco.IDisposable {
  const snippets = build_snippets();

  const provider = monaco.languages.registerCompletionItemProvider(
    ["html", "htm"],
    {
      triggerCharacters: ["!", ".", "#", "<"],

      provideCompletionItems(
        model: monaco.editor.ITextModel,
        position: monaco.Position,
      ): monaco.languages.CompletionList {
        const line = model.getLineContent(position.lineNumber);
        const text_before = line.substring(0, position.column - 1);

        const token_match = text_before.match(/[!#.\w:-]+$/);
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
            sortText: "0_" + s.label,
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
              sortText: "00_emmet",
              preselect: true,
            });
          }
        }

        return { suggestions: items };
      },
    },
  );

  return provider;
}

export function setup_html_auto_close(
  editor: monaco.editor.IStandaloneCodeEditor,
): monaco.IDisposable {
  return editor.onDidChangeModelContent(
    (e: monaco.editor.IModelContentChangedEvent) => {
      if (e.changes.length !== 1) return;
      const change = e.changes[0];
      if (change.text !== ">") return;

      const model = editor.getModel();
      if (!model) return;

      const lang = model.getLanguageId();
      if (lang !== "html" && lang !== "htm") return;

      const position = editor.getPosition();
      if (!position) return;

      const line = model.getLineContent(position.lineNumber);
      const text_up_to_cursor = line.substring(0, position.column - 1);

      const tag_match = text_up_to_cursor.match(
        /<([a-zA-Z][a-zA-Z0-9-]*)(?:\s[^>]*)?\s*$/,
      );
      if (!tag_match) return;

      const tag_name = tag_match[1].toLowerCase();
      if (VOID_TAGS.has(tag_name)) return;

      // const before_close = text_up_to_cursor.slice(
      //   0,
      //   text_up_to_cursor.lastIndexOf("<" + tag_match[1]),
      // );
      if (text_up_to_cursor.trimEnd().endsWith("/")) return;

      const closing_tag = `</${tag_name}>`;

      const insert_position = {
        lineNumber: position.lineNumber,
        column: position.column,
      };
      editor.executeEdits("auto-close-tag", [
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
