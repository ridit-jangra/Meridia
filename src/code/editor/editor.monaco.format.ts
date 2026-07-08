import { monaco } from "./editor.helper";

/**
 * Languages we hand to Prettier. Python (and anything else with a language
 * server) is formatted through the LSP provider registered by the relay
 * client, so it is deliberately absent here.
 */
const PRETTIER_LANGUAGES = [
  "typescript",
  "javascript",
  "typescriptreact",
  "javascriptreact",
  "json",
  "jsonc",
  "css",
  "scss",
  "less",
  "html",
  "markdown",
  "yaml",
  "graphql",
];

const provider: monaco.languages.DocumentFormattingEditProvider = {
  async provideDocumentFormattingEdits(model) {
    const path = model.uri.fsPath;
    if (!path) return [];

    const text = model.getValue();
    const opts = model.getOptions();

    const formatted = await window.format.document(path, text, {
      tab_size: opts.tabSize,
      insert_spaces: opts.insertSpaces,
    });

    // `null` => ignored/unsupported/parse-error; identical => nothing to do.
    if (formatted == null || formatted === text) return [];

    return [{ range: model.getFullModelRange(), text: formatted }];
  },
};

// A string selector is matched against the model's language id at format time,
// so registering an id that Monaco defines later (tsx/jsx are registered by
// editor.monaco.customize) — or never — is harmless.
for (const language of PRETTIER_LANGUAGES) {
  monaco.languages.registerDocumentFormattingEditProvider(language, provider);
}
