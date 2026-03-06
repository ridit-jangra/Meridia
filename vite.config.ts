import { defineConfig } from "vite";
import path from "node:path";
import electron from "vite-plugin-electron/simple";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  resolve: {
    alias: {
      vscode: path.resolve(
        __dirname,
        "node_modules/monaco-languageclient/lib/vscode-compatibility.js",
      ),
    },
  },
  optimizeDeps: {
    include: ["vscode-jsonrpc", "vscode-ws-jsonrpc"],
    exclude: ["vscode-languageclient"],
  },
  plugins: [
    tailwindcss(),
    electron({
      main: {
        entry: "electron/main.ts",
        vite: {
          build: {
            rollupOptions: {
              external: ["node-pty", "bufferutil", "utf-8-validate", "ws"],
            },
          },
        },
      },
      preload: { input: path.join(__dirname, "electron/preload.ts") },
      renderer: process.env.NODE_ENV === "test" ? undefined : {},
    }),
  ],
});
