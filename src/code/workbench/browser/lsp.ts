import { statusbar_events } from "../../platform/events/statusbar.events";
import { editor_events } from "../../platform/events/editor.events";
import { StatusbarItem } from "./parts/statusbar/statusbar";
import {
  LSP_CHECK,
  LSP_INSTALL,
  LSP_INSTALL_DONE,
  LSP_INSTALL_ERROR,
} from "../../../../shared/ipc/channels";

export type LspId =
  | "pylsp"
  | "typescript-language-server"
  | "rust-analyzer"
  | "golsp";

const EXTENSION_LSP_MAP: Record<string, LspId> = {
  py: "pylsp",
  pyi: "pylsp",
  ts: "typescript-language-server",
  tsx: "typescript-language-server",
  js: "typescript-language-server",
  jsx: "typescript-language-server",
  mjs: "typescript-language-server",
  mts: "typescript-language-server",
  cjs: "typescript-language-server",
  rs: "rust-analyzer",
  go: "golsp",
};

export const LSPS: Record<LspId, { name: string }> = {
  pylsp: {
    name: "Python LSP Server",
  },
  "typescript-language-server": {
    name: "TypeScript Language Server",
  },
  "rust-analyzer": {
    name: "Rust Analyzer",
  },
  golsp: {
    name: "Go Language Server",
  },
};

const checked = new Set<LspId>();
const installing = new Set<LspId>();

function show_install_item(lsp_id: LspId) {
  const item = StatusbarItem();
  item.setText(`Installing ${lsp_id}...`);
  statusbar_events.emit("addItemOnRight", item.el);

  const cleanup_done = window.ipc.on(LSP_INSTALL_DONE, (_: any, id: LspId) => {
    if (id !== lsp_id) return;
    item.setText(`${lsp_id} ready`);
    item.el.style.color = "var(--color-success, #4ade80)";
    setTimeout(() => {
      statusbar_events.emit("removeItemFromRight", item.el);
    }, 3000);
    (cleanup_done as unknown as () => void)();
    (cleanup_err as unknown as () => void)();
  });

  const cleanup_err = window.ipc.on(
    LSP_INSTALL_ERROR,
    (_: any, id: LspId, msg: string) => {
      if (id !== lsp_id) return;
      item.setText(`${lsp_id} failed`);
      item.el.style.color = "var(--color-error, #f87171)";
      item.el.title = msg;
      console.log("lsp install error", msg);
      (cleanup_done as unknown as () => void)();
      (cleanup_err as unknown as () => void)();
    },
  );
}

export async function on_file_opened(file_path: string): Promise<void> {
  const ext = file_path.split(".").pop()?.toLowerCase();
  if (!ext) return;

  const lsp_id = EXTENSION_LSP_MAP[ext];
  if (!lsp_id) return;

  const exists = await check_lsp(lsp_id);
  if (exists) return;

  // await check_and_install_lsp(lsp_id);
  const dialog = await window.dialog.confirm(
    `The file you opened (${file_path}) can be enhanced with ${LSPS[lsp_id].name}. Do you want to install it? you can always install later from settings.`,
  );
  if (dialog) {
    await check_and_install_lsp(lsp_id);
  }
}

export async function check_and_install_lsp(lsp_id: LspId): Promise<void> {
  if (checked.has(lsp_id) || installing.has(lsp_id)) return;

  const result = await window.ipc.invoke(LSP_CHECK, lsp_id).catch(() => null);
  if (result?.installed) {
    checked.add(lsp_id);
    return;
  }

  await install_lsp(lsp_id);
}

export async function check_lsp(lsp_id: LspId): Promise<boolean> {
  if (checked.has(lsp_id)) return true;
  if (installing.has(lsp_id)) return false;

  const result = await window.ipc.invoke(LSP_CHECK, lsp_id).catch(() => null);
  if (result?.installed) {
    checked.add(lsp_id);
    return true;
  }
  return false;
}

async function install_lsp(lsp_id: LspId): Promise<void> {
  if (installing.has(lsp_id)) return;
  installing.add(lsp_id);

  show_install_item(lsp_id);

  const done = new Promise<void>((resolve) => {
    const off_done = window.ipc.on(LSP_INSTALL_DONE, (_: any, id: LspId) => {
      if (id !== lsp_id) return;
      installing.delete(lsp_id);
      checked.add(lsp_id);
      (off_done as unknown as () => void)();
      (off_err as unknown as () => void)();
      editor_events.emit("lsp-restart");
      resolve();
    });
    const off_err = window.ipc.on(LSP_INSTALL_ERROR, (_: any, id: LspId) => {
      if (id !== lsp_id) return;
      installing.delete(lsp_id);
      (off_done as unknown as () => void)();
      (off_err as unknown as () => void)();
      resolve();
    });
  });

  window.ipc.invoke(LSP_INSTALL, lsp_id).catch(() => {
    installing.delete(lsp_id);
  });

  await done;
}
