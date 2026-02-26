import { INode } from "../../../shared/types/explorer.types";
import { explorer_events } from "../../events/explorer.events";

export class explorer_watcher {
  public async start_watcher(path: string) {
    await window.watcher.start(path);
  }

  public async stop_watcher(path: string) {
    await window.watcher.stop(path);
  }

  public async attach_listener() {
    window.ipc.on("workbench.explorer.add", (_, node: INode) => {
      explorer_events.emit("add", node);
    });

    window.ipc.on("workbench.explorer.remove", (_, path: string) => {
      explorer_events.emit("remove", path);
    });

    window.ipc.on(
      "workbench.explorer.rename",
      (_, from: string, to: string) => {
        explorer_events.emit("rename", from, to);
      },
    );
  }
}
