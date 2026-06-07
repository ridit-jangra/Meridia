import {
  GIT_DELETED_REPO,
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
  private queued_status: GitStatus | null = null;

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
      if (!this.tree) return;

      const accepted = this.tree.refresh_git_status(status);
      if (!accepted) {
        this.queued_status = status;
      } else {
        this.queued_status = null;
      }
    });
  }

  flush_queued_status() {
    if (!this.queued_status) return;
    const status = this.queued_status;
    this.queued_status = null;
    this.schedule_refresh(status);
  }

  attach_listener() {
    if (this.attached) return;
    this.attached = true;
    this.disposers.push(
      window.ipc.on(GIT_REFRESH_STATUS, (_, status: GitStatus) => {
        console.log("tree", this.tree);
        if (!this.tree) {
          this.pending_status = status;
          return;
        }
        git_events.emit("refresh-status", status);
        console.log("sending new status", status);
      }),
      window.ipc.on(GIT_DELETED_REPO, () => {
        git_events.emit("refresh-status", {
          branch: "",
          ahead: 0,
          behind: 0,
          files: [],
          has_commits: false,
        });
        git_events.emit("initUi");
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
