const esbuild = require("esbuild");
const fg = require("fast-glob");
const { copyFileSync, mkdirSync, existsSync } = require("fs");
const { nodeExternalsPlugin } = require("esbuild-node-externals");

const watch = process.argv.includes("--watch");
const prod = process.argv.includes("--prod");
const env = prod ? "production" : "development";

const common = {
  bundle: true,
  sourcemap: false,
  minify: prod,
  logLevel: "error",
};

async function buildAll() {
  // Entry globs
  const rendererEntries = await fg([
    "src/code/workbench/**/*.ts",
    "src/code/platform/**/*.ts",
  ]);

  // Separate extensions entries outside src/
  const extensionEntries = await fg(["extensions/**/*.ts"]);

  const electronEntries = [
    "src/main.ts",
    ...(await fg(["src/code/base/**/*.ts", "src/code/editor/**/*.ts"])),
  ];

  const workerEntries = {
    "workers/editor.worker":
      "node_modules/monaco-editor-core/esm/vs/editor/editor.worker.js",
    "workers/ts.worker":
      "node_modules/monaco-editor/esm/vs/language/typescript/ts.worker.js",
    "workers/json.worker":
      "node_modules/monaco-editor/esm/vs/language/json/json.worker.js",
    "workers/css.worker":
      "node_modules/monaco-editor/esm/vs/language/css/css.worker.js",
    "workers/html.worker":
      "node_modules/monaco-editor/esm/vs/language/html/html.worker.js",
  };

  const Loaders = {
    ".ttf": "dataurl",
    ".woff": "file",
    ".woff2": "file",
    ".svg": "file",
    ".py": "text",
    ".css": "text",
    ".html": "text",
  };

  const rendererOpts = {
    ...common,
    entryPoints: rendererEntries,
    outbase: "src",
    outdir: "build",
    platform: "browser",
    format: "esm",
    splitting: true,
    target: ["chrome114"],
    define: { "process.env.NODE_ENV": JSON.stringify(env) },
    assetNames: "assets/[name]",
    chunkNames: "chunks/[name]-[hash]",
    metafile: true,
    loader: Loaders,
    alias: {
      "monaco-languages": "monaco-languages/release/esm/monaco.contribution",
      vscode: "monaco-languageclient/lib/vscode-compatibility",
    },
    external: [],
  };

  // Build extensions separately with proper outbase and folder structure
  const extensionsOpts = {
    ...common,
    entryPoints: extensionEntries,
    outbase: ".", // important: preserve extensions folder relative to project root
    outdir: "build",
    platform: "browser",
    format: "esm",
    splitting: true,
    target: ["chrome114"],
    define: { "process.env.NODE_ENV": JSON.stringify(env) },
    loader: Loaders,
  };

  const workersOpts = {
    bundle: true,
    format: "esm",
    platform: "browser",
    target: ["chrome114"],
    entryPoints: workerEntries,
    outdir: "build/workers",
    entryNames: "[name]",
    sourcemap: false,
    minify: prod,
  };

  const electronOpts = {
    bundle: true,
    platform: "node",
    format: "cjs",
    target: ["node18"],
    entryPoints: electronEntries,
    outdir: "build",
    sourcemap: false,
    assetNames: "assets/[name]",
    chunkNames: "chunks/[name]-[hash]",
    minify: prod,
    plugins: [nodeExternalsPlugin()],
    external: [
      "electron",
      "node-pty",
      "electron-reload",
      "@meridia/win32-x64-msvc",
      "@meridia/darwin-x64",
      "@meridia/darwin-arm64",
      "@meridia/linux-x64-gnu",
      "@meridia/linux-arm64-gnu",
    ],
    logLevel: "error",
    loader: {
      ...Loaders,
      ".node": "copy",
    },
  };

  if (watch) {
    const rendererCtx = await esbuild.context(rendererOpts);
    const extensionsCtx = await esbuild.context(extensionsOpts);
    const workersCtx = await esbuild.context(workersOpts);
    const electronCtx = await esbuild.context(electronOpts);

    await Promise.all([
      rendererCtx.watch(),
      extensionsCtx.watch(),
      workersCtx.watch(),
      electronCtx.watch(),
    ]);
  } else {
    await Promise.all([
      esbuild.build(rendererOpts),
      esbuild.build(extensionsOpts),
      esbuild.build(workersOpts),
      esbuild.build(electronOpts),
    ]);
  }
}

if (!existsSync("build/code/workbench/browser/workbench.media/fonts")) {
  mkdirSync("build/code/workbench/browser/workbench.media/fonts", {
    recursive: true,
  });
}

const fontSrc =
  "node_modules/monaco-editor/esm/vs/base/browser/ui/codicons/codicon/codicon.ttf";
const fontDest =
  "build/code/workbench/browser/workbench.media/fonts/codicon.ttf";
copyFileSync(fontSrc, fontDest);

buildAll().catch((e) => {
  console.error(e);
  process.exit(1);
});
