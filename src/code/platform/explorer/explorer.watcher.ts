import { INode } from "../../../../shared/types/explorer.types";
import { VirtualTreeInstance } from "../../../types/explorer.types";
import { explorer_events } from "../events/explorer.events";

export class explorer_watcher {
  private disposers: (() => void)[] = [];
  private attached = false;

  async start_watcher(path: string) {
    await window.watcher.start(path);
  }

  async stop_watcher(path: string) {
    await window.watcher.stop(path);
  }

  public async attach_tree_listener(tree: VirtualTreeInstance) {
    explorer_events.on("add", (node: INode) => {
      tree.add(node);
    });

    explorer_events.on("remove", (path: string) => {
      tree.remove(path);
    });

    explorer_events.on("rename", (from: string, to: string) => {
      console.log("rename", from, to);
      tree.rename(from, to);
    });

    explorer_events.on("highlight", (id: string) => {
      tree?.highlight?.(id);
    });
  }

  attach_listener() {
    if (this.attached) return;
    this.attached = true;

    this.disposers.push(
      window.ipc.on("workbench.explorer.add", (_, node: INode) => {
        explorer_events.emit("add", node);
      }),
    );

    this.disposers.push(
      window.ipc.on("workbench.explorer.remove", (_, p: string) => {
        explorer_events.emit("remove", p);
      }),
    );

    this.disposers.push(
      window.ipc.on(
        "workbench.explorer.rename",
        (_, from: string, to: string) => {
          explorer_events.emit("rename", from, to);
        },
      ),
    );
  }

  detach_listener() {
    for (const d of this.disposers) d();
    this.disposers = [];
    this.attached = false;
  }
}
