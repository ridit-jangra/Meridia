import { defineConfig } from "vite";
import path from "node:path";
import electron from "vite-plugin-electron/simple";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  optimizeDeps: {
    include: ["monaco-languageclient", "vscode-ws-jsonrpc"],
  },
  plugins: [
    tailwindcss(),
    electron({
      main: {
        entry: "electron/main.ts",
        vite: {
          build: {
            rollupOptions: {
              external: ["node-pty", "bufferutil", "utf-8-validate"],
            },
          },
        },
      },
      preload: { input: path.join(__dirname, "electron/preload.ts") },
      renderer: process.env.NODE_ENV === "test" ? undefined : {},
    }),
  ],
});
