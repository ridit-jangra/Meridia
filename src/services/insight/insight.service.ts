import { history } from "../history/history.service";
import { Insight } from "./insight.types";

export class insight_service {
  private current: Insight | null = null;
  private active_file: string | null = null;
  private snoozed = new Set<string>();

  evaluate(): Insight | null {
    const recent = history.list(30);

    const last = [...recent].reverse().find((i) => {
      return i.kind === "editor.tab.open" || i.kind === "editor.tab.close";
    });

    if (!last) {
      this.current = null;
      this.active_file = null;
      return null;
    }

    if (last.kind === "editor.tab.open") {
      this.active_file = last.data?.file_path ?? null;
    }

    if (last.kind === "editor.tab.close") {
      if (this.active_file === last.data?.file_path) this.active_file = null;
    }

    const file = this.active_file;

    if (!file) {
      this.current = null;
      return null;
    }

    if (this.snoozed.has(file)) {
      this.current = null;
      return null;
    }

    const is_service =
      file.includes("/services/") ||
      file.includes("\\services\\") ||
      file.endsWith("-service.ts") ||
      file.endsWith(".service.ts");

    if (!is_service) {
      this.current = null;
      return null;
    }

    this.current = {
      id: "suggest.ipc",
      message: "Add IPC handler for this service",
      actions: [
        { label: "Generate", run() {} },
        { label: "Dismiss", run() {} },
      ],
      meta: { file_path: file },
    };

    return this.current;
  }

  get_current() {
    return this.current;
  }

  act(action_id: string) {
    if (!this.current) return;

    const file = this.current.meta?.file_path as string | undefined;

    if (this.current.id === "suggest.ipc") {
      if (action_id === "dismiss") {
        if (file) this.snoozed.add(file);
        this.current = null;
        return;
      }

      if (action_id === "generate") {
        console.log("generate ipc...", file);
      }
    }
  }
}

export const insights = new insight_service();
