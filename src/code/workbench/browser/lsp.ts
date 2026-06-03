import {
  LSP_CHECK,
  LSP_INSTALL,
  LSP_INSTALL_PROGRESS,
  LSP_INSTALL_DONE,
  LSP_INSTALL_ERROR,
} from "../../../../shared/ipc/channels";
import { statusbar_events } from "../../platform/events/statusbar.events";
import { editor_events } from "../../platform/events/editor.events";
import { StatusbarItem } from "../browser/parts/statusbar/statusbar";

type LspId = "pylsp" | "typescript-language-server";

const checked = new Set<LspId>();
const installing = new Set<LspId>();

function make_statusbar_item(lsp_id: LspId) {
  const item = StatusbarItem();

  const on_done = window.ipc.on(LSP_INSTALL_DONE, (_, id: LspId) => {
    if (id !== lsp_id) return;
    item.setText(`✓ ${lsp_id} ready`);
    setTimeout(() => {
      statusbar_events.emit("removeItemFromRight", item.el);
      off_done();
      off_err();
    }, 3000);
    installing.delete(lsp_id);
    editor_events.emit("lsp-restart");
  });

  const on_err = window.ipc.on(
    LSP_INSTALL_ERROR,
    (_, id: LspId, msg: string) => {
      if (id !== lsp_id) return;
      item.setText(`✗ ${lsp_id} failed`);
      item.el.title = msg;
      item.el.style.color = "var(--color-error, #f87171)";
      installing.delete(lsp_id);
      off_done();
    },
  );

  const off_done = on_done as unknown as () => void;
  const off_err = on_err as unknown as () => void;

  return item;
}

export async function check_and_install_lsp(lsp_id: LspId): Promise<void> {
  if (checked.has(lsp_id) || installing.has(lsp_id)) return;
  checked.add(lsp_id);

  const result = await window.ipc.invoke(LSP_CHECK, lsp_id);
  if (result?.installed) return;

  await install_lsp(lsp_id);
}

export async function install_lsp(lsp_id: LspId): Promise<void> {
  if (installing.has(lsp_id)) return;
  installing.add(lsp_id);

  const item = make_statusbar_item(lsp_id);
  item.setText(`Installing ${lsp_id}...`);
  statusbar_events.emit("addItemOnRight", item.el);

  window.ipc.invoke(LSP_INSTALL, lsp_id);
}

export function pipe_install_to_terminal(
  lsp_id: LspId,
  write: (s: string) => void,
) {
  const off = window.ipc.on(
    LSP_INSTALL_PROGRESS,
    (_, id: LspId, chunk: string) => {
      if (id === lsp_id) write(chunk);
    },
  );

  const cleanup = () => {
    (off as unknown as () => void)();
  };
  window.ipc.on(LSP_INSTALL_DONE, (_, id: LspId) => {
    if (id === lsp_id) cleanup();
  });
  window.ipc.on(LSP_INSTALL_ERROR, (_, id: LspId) => {
    if (id === lsp_id) cleanup();
  });
}
