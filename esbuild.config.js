const esbuild = require("esbuild");
const fg = require("fast-glob");
const { copyFileSync, mkdirSync, existsSync, readdirSync } = require("fs");
const { nodeExternalsPlugin } = require("esbuild-node-externals");
const path = require("path");

const watch = process.argv.includes("--watch");
const prod = process.argv.includes("--prod");
const env = prod ? "production" : "development";

const Loaders = {
  ".ttf": "dataurl",
  ".woff": "file",
  ".woff2": "file",
  ".node": "copy",
  ".svg": "file",
  ".py": "text",
  ".css": "text",
  ".html": "text",
};

const NODE_BUILTINS = [
  "fs",
  "path",
  "os",
  "http",
  "https",
  "net",
  "stream",
  "child_process",
  "events",
  "util",
  "crypto",
  "url",
  "worker_threads",
  "fs/promises",
  "node:fs",
  "node:path",
  "node:stream",
  "node:child_process",
  "node:net",
];

const platformConfigs = {
  browser: {
    platform: "browser",
    format: "esm",
    target: ["chrome114"],
    splitting: true,
    assetNames: "assets/[name]",
    chunkNames: "chunks/[name]-[hash]",
  },
  node: {
    platform: "node",
    format: "cjs",
    target: ["node18"],
    splitting: false,
    plugins: [nodeExternalsPlugin()],
    assetNames: "assets/[name]",
    chunkNames: "chunks/[name]-[hash]",
  },
  electron: {
    platform: "node",
    format: "cjs",
    target: ["node18"],
    splitting: false,
    plugins: [nodeExternalsPlugin()],
    assetNames: "assets/[name]",
    chunkNames: "chunks/[name]-[hash]",
  },
};

const common = {
  bundle: true,
  sourcemap: false,
  minify: prod,
  logLevel: "error",
};

/**
 * Recursively discover build targets
 * Separates browser code from node-dependent code
 */
async function discoverBuildTargets() {
  const targets = [];

  const rendererEntries = await fg([
    "src/code/workbench/**/*.ts",
    "!src/code/workbench/node/**/*.ts",
    "!src/code/workbench/electron-browser/**/*.ts",
    "src/code/platform/**/*.ts",
    "src/code/editor/**/*.ts",
  ]);

  if (rendererEntries.length > 0) {
    targets.push({
      name: "renderer",
      platform: "browser",
      entryPoints: rendererEntries,
      outbase: "src",
      outdir: "build",
      options: {
        define: { "process.env.NODE_ENV": JSON.stringify(env) },
        metafile: true,
        loader: Loaders,
        alias: {
          "monaco-languages":
            "monaco-languages/release/esm/monaco.contribution",
          vscode: "monaco-languageclient/lib/vscode-compatibility",
        },
        external: ["@meridia/*", ...NODE_BUILTINS],
      },
    });
  }

  const preloadEntries = await fg([
    "src/code/workbench/electron-browser/**/*.ts",
  ]);

  if (preloadEntries.length > 0) {
    targets.push({
      name: "preload",
      platform: "node",
      entryPoints: preloadEntries,
      outbase: "src",
      outdir: "build",
      options: {
        define: { "process.env.NODE_ENV": JSON.stringify(env) },
        loader: Loaders,
        external: ["electron", "@meridia/*"],
      },
    });
  }

  const nodeUtilEntries = await fg(["src/code/workbench/node/**/*.ts"]);

  if (nodeUtilEntries.length > 0) {
    targets.push({
      name: "node-utils",
      platform: "node",
      entryPoints: nodeUtilEntries,
      outbase: "src",
      outdir: "build",
      options: {
        define: { "process.env.NODE_ENV": JSON.stringify(env) },
        loader: {
          ...Loaders,
          ".node": "copy",
        },
        external: ["@meridia/*"],
      },
    });
  }

  const extensionEntries = await fg(["extensions/**/*.ts"]);

  if (extensionEntries.length > 0) {
    targets.push({
      name: "extensions",
      platform: "browser",
      entryPoints: extensionEntries,
      outbase: ".",
      outdir: "build",
      options: {
        define: { "process.env.NODE_ENV": JSON.stringify(env) },
        loader: Loaders,
        external: ["@meridia/*"],
      },
    });
  }

  const electronEntries = [
    "src/code/workbench/electron-browser/window.ts",
    ...(await fg(["src/code/base/**/*.ts"])),
  ];

  if (electronEntries.length > 0) {
    targets.push({
      name: "electron",
      platform: "electron",
      entryPoints: electronEntries,
      outbase: "src",
      outdir: "build",
      options: {
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
        loader: {
          ...Loaders,
          ".node": "copy",
        },
      },
    });
  }

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

  targets.push({
    name: "workers",
    platform: "browser",
    entryPoints: workerEntries,
    outbase: ".",
    outdir: "build/workers",
    options: {
      entryNames: "[name]",
      loader: Loaders,
      external: ["@meridia/*", ...NODE_BUILTINS],
    },
  });

  return targets;
}

/**
 * Build options from target configuration
 */
function buildOptions(target) {
  const platformConfig = platformConfigs[target.platform];

  return {
    ...common,
    ...platformConfig,
    entryPoints: target.entryPoints,
    outbase: target.outbase,
    outdir: target.outdir,
    ...target.options,
  };
}

/**
 * Execute all builds
 */
async function buildAll() {
  const targets = await discoverBuildTargets();
  const contexts = [];

  console.log(`[build] Found ${targets.length} build targets`);

  for (const target of targets) {
    const opts = buildOptions(target);
    const entryCount = Array.isArray(target.entryPoints)
      ? target.entryPoints.length
      : Object.keys(target.entryPoints).length;

    console.log(
      `[build] ${target.name} (${target.platform}) with ${entryCount} entries`
    );

    if (watch) {
      const ctx = await esbuild.context(opts);
      contexts.push({ name: target.name, ctx });
      await ctx.watch();
    } else {
      await esbuild.build(opts);
    }
  }

  if (watch) {
    console.log("[build] Watching for changes...");

    await new Promise(() => {});
  }
}

/**
 * Copy required assets
 */
function copyAssets() {
  const fontDir = "build/code/workbench/browser/media/fonts";

  if (!existsSync(fontDir)) {
    mkdirSync(fontDir, { recursive: true });
  }

  const fontSrc =
    "node_modules/monaco-editor/esm/vs/base/browser/ui/codicons/codicon/codicon.ttf";
  const fontDest = `${fontDir}/codicon.ttf`;

  copyFileSync(fontSrc, fontDest);
  console.log(`[assets] Copied codicon font`);
}

async function main() {
  try {
    copyAssets();
    await buildAll();
  } catch (e) {
    console.error("[error]", e);
    process.exit(1);
  }
}

main();
