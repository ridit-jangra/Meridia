import path from "path";
import { INode, TWatchEvent } from "../../shared/types/explorer.types";
import { generate_uri } from "../../shared/uri/generate";
import { event_emitter } from "./emitter";

export function attach_event_listener(e: TWatchEvent) {
  if (e.type === "add") {
    const normalized_path = generate_uri(e.path);
    const node: INode = {
      child_nodes: [],
      id: normalized_path,
      name: path.basename(e.path),
      path: normalized_path,
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
      generate_uri(e.path),
    );
  } else if (e.type === "rename") {
    event_emitter.emit(
      "window.webContents.send",
      "workbench.explorer.rename",
      generate_uri(e.from),
      generate_uri(e.to),
    );
  } else {
    event_emitter.emit(
      "window.webContents.send",
      "workbench.explorer.change",
      generate_uri(e.path),
    );
  }
}
