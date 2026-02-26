import path from "path";
import { INode } from "../../shared/types/explorer.types";
import { event_emitter } from "./emitter";
import { TWatchEvent } from "./types/explorer-service.types";

export function attach_event_listener(e: TWatchEvent) {
  if (e.type === "add") {
    const node: INode = {
      child_nodes: [],
      id: e.path,
      name: path.basename(e.path),
      path: e.path,
      type: e.isDir ? "folder" : "file",
    };
    event_emitter.emit(
      "window.webContents.send",
      "workbench.explorer.add",
      node,
    );
  } else if (e.type === "remove") {
    event_emitter.emit(
      "window.webContents.send",
      "workbench.explorer.remove",
      e.path,
    );
  } else if (e.type === "rename") {
    event_emitter.emit(
      "window.webContents.send",
      "workbench.explorer.rename",
      e.from,
      e.to,
    );
  } else {
    event_emitter.emit(
      "window.webContents.send",
      "workbench.explorer.change",
      e.path,
    );
  }
}
