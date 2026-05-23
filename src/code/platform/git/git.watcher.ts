import {
  GIT_GET_STATUS,
  GIT_REFRESH_STATUS,
} from "../../../../shared/ipc/channels";
import { GitStatus } from "../../../../shared/types/git.types";
import { VirtualTreeInstance } from "../../../types/explorer.types";
import { git_events } from "../events/git.events";

export class git_watcher {
  private disposers: (() => void)[] = [];
  private attached = false;
  private tree: VirtualTreeInstance | null = null;
  private pending_status: GitStatus | null = null;
  private raf: number | null = null;

  attach_tree_listener(tree: VirtualTreeInstance) {
    this.tree = tree;
    if (this.pending_status) {
      this.schedule_refresh(this.pending_status);
      this.pending_status = null;
    }
    git_events.on("refresh-status", (status: GitStatus) => {
      this.schedule_refresh(status);
    });
  }

  private schedule_refresh(status: GitStatus) {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => {
      this.raf = null;
      this.tree?.refresh_git_status(status);
    });
  }

  attach_listener() {
    if (this.attached) return;
    this.attached = true;

    this.disposers.push(
      window.ipc.on(GIT_REFRESH_STATUS, (_, status: GitStatus) => {
        if (!this.tree) {
          this.pending_status = status;
          return;
        }
        git_events.emit("refresh-status", status);
      }),
    );

    this.request_status();
  }

  async request_status() {
    const path = await window.workspace.get_current_workspace_path();
    if (!path) return;
    window.ipc.invoke(GIT_GET_STATUS, path);
  }

  dispose() {
    this.disposers.forEach((d) => d());
    this.disposers = [];
    this.attached = false;
    if (this.raf) cancelAnimationFrame(this.raf);
  }
}
