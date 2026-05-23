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

    explorer_events.on("add_many", (nodes: INode[]) => {
      console.log("add_many received", nodes.length, "nodes");
      console.time("add_many_total");
      explorer_events.emit("start-loading");
      tree.add_many(nodes);
      explorer_events.emit("stop-loading");
      console.timeEnd("add_many_total");
    });

    explorer_events.on("remove", (path: string) => {
      tree.remove(path);
    });

    explorer_events.on("remove_many", (paths: string[]) => {
      explorer_events.emit("start-loading");
      tree.remove_many(paths);
      explorer_events.emit("stop-loading");
    });

    explorer_events.on("rename", (from: string, to: string) => {
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
      window.ipc.on("workbench.explorer.add_many", (_, nodes: INode[]) => {
        console.log("ipc add_many received", nodes.length, "nodes");
        explorer_events.emit("add_many", nodes);
      }),
    );

    this.disposers.push(
      window.ipc.on("workbench.explorer.remove", (_, p: string) => {
        explorer_events.emit("remove", p);
      }),
    );

    this.disposers.push(
      window.ipc.on("workbench.explorer.remove_many", (_, paths: string[]) => {
        console.log("ipc remove_many received", paths.length, "paths");
        console.time("remove_many_total");
        explorer_events.emit("remove_many", paths);
        console.timeEnd("remove_many_total");
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
