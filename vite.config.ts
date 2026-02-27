import { defineConfig } from "vite";
import path from "node:path";
import electron from "vite-plugin-electron/simple";
import tailwindcss from "@tailwindcss/vite";
import monacoEditorPluginImport from "vite-plugin-monaco-editor";

const monacoEditorPlugin =
  (monacoEditorPluginImport as any).default ?? monacoEditorPluginImport;

export default defineConfig({
  plugins: [
    monacoEditorPlugin({}),
    tailwindcss(),
    electron({
      main: {
        entry: "electron/main.ts",
        vite: {
          build: {
            rollupOptions: {
              external: ["node-pty"],
            },
          },
        },
      },
      preload: { input: path.join(__dirname, "electron/preload.ts") },
      renderer: process.env.NODE_ENV === "test" ? undefined : {},
    }),
  ],
});
