import { defineConfig } from "vite";
import path from "node:path";
import electron from "vite-plugin-electron/simple";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  optimizeDeps: {
    // Pre-bundle CJS packages into ESM for the renderer dev server.
    // vscode-jsonrpc and vscode-ws-jsonrpc are CJS — without this they
    // throw "does not provide an export named X".
    include: ["vscode-jsonrpc", "vscode-ws-jsonrpc"],
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
