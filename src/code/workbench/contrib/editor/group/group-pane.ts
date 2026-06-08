import { ITab } from "../../../../../types/editor.types";
import { store } from "../../../common/state/store";
import { set_active_group } from "../../../common/state/slices/editor.slice";
import { h } from "../../core/dom/h";
import { SettingsPanel } from "../../../browser/parts/settings/settings-panel";
import { Preview } from "../../preview/preview";
import { FS_READ_BASE_64 } from "../../../../../../shared/ipc/channels";
import { CodeGroupView } from "./code-view";
import { GroupTabs } from "./group-tabs";
import { DockSide } from "./grid";
import { current_tab_drag } from "./dnd";
import { dock_into_group, dock_to_edge } from "./actions";
import { IMAGE_MIME, diff_view } from "./special";

function ext_of(file_path: string): string {
  return file_path.slice(file_path.lastIndexOf(".") + 1).toLowerCase();
}

function is_image(file_path: string): boolean {
  return ext_of(file_path) in IMAGE_MIME;
}

function group_tabs(group_id: string): ITab[] {
  return (
    store.getState().editor.groups.find((g) => g.id === group_id)?.tabs ?? []
  );
}

type Zone = DockSide | "center";

export function GroupPane(group_id: string) {
  const tabs_ui = GroupTabs(group_id);
  const code_view = new CodeGroupView(group_id);

  const empty_state = h(
    "div",
    {
      class:
        "absolute inset-0 flex items-center justify-center text-muted-foreground text-[13px] select-none pointer-events-none",
    },
    "No file open",
  );

  const image_host = h("div", {
    class:
      "absolute inset-0 flex items-center justify-center overflow-auto p-4",
    style: "display:none",
  });

  let settings_panel: ReturnType<typeof SettingsPanel> | null = null;
  // One browser webview per preview tab (keyed by tab uri).
  const preview_els = new Map<string, HTMLElement>();

  const prune_previews = () => {
    const live = new Set(
      group_tabs(group_id)
        .filter((t) => t.tab_type === "PREVIEW")
        .map((t) => t.file_path),
    );
    for (const [uri, el] of preview_els) {
      if (!live.has(uri)) {
        el.remove();
        preview_els.delete(uri);
      }
    }
  };

  const show_preview = (uri: string): HTMLElement => {
    let el = preview_els.get(uri);
    if (!el) {
      el = Preview();
      el.style.height = "100%";
      body.insertBefore(el, overlay);
      preview_els.set(uri, el);
    }
    for (const [u, e] of preview_els) show(e, u === uri);
    return el;
  };

  const highlight = h("div", {
    class: "absolute z-30 pointer-events-none",
    style: "display:none",
  });

  const overlay = h("div", {
    class: "absolute inset-0 z-20",
    style: "pointer-events:none",
  });

  const body = h(
    "div",
    { class: "relative flex-1 min-h-0 bg-panel-background" },
    code_view.el,
    image_host,
    empty_state,
    overlay,
    highlight,
  );

  const root = h(
    "div",
    {
      class: "flex flex-col h-full min-h-0 bg-panel-background relative",
      on: {
        mousedown: () => {
          if (store.getState().editor.active_group_id !== group_id)
            store.dispatch(set_active_group(group_id));
        },
      },
    },
    tabs_ui.el,
    body,
  );

  const show = (el: HTMLElement, visible: boolean) => {
    el.style.display = visible ? "" : "none";
  };

  let image_blob: string | null = null;
  let image_uri = "";

  const render_image = async (uri: string) => {
    if (image_uri === uri && image_host.firstChild) return;
    image_uri = uri;
    if (image_blob) {
      URL.revokeObjectURL(image_blob);
      image_blob = null;
    }
    image_host.innerHTML = "";
    const mime = IMAGE_MIME[ext_of(uri)] ?? "image/png";
    try {
      const b64 = await window.ipc.invoke<string>(FS_READ_BASE_64, uri);
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      image_blob = URL.createObjectURL(new Blob([bytes], { type: mime }));
      const img = h("img", {
        class: "max-w-full max-h-full object-contain select-none",
        attrs: { draggable: "false" },
      }) as HTMLImageElement;
      img.src = image_blob;
      image_host.appendChild(img);
    } catch {
      image_host.textContent = "Failed to load image.";
    }
  };

  const hide_diff = () => {
    const ed = diff_view();
    if (body.contains(ed.editor.el)) ed.set_visible(false);
  };

  const show_diff = async (uri: string) => {
    const ed = diff_view();
    ed.mount(body);
    body.insertBefore(ed.editor.el, overlay);
    let m = ed.get_model(uri);
    if (!m) {
      m = await ed.create_model(uri);
      ed.add_model(m);
    }
    await ed.set_model_active(uri);
    ed.set_visible(true);
  };

  let last_key = "";

  const hide_aux = () => {
    if (settings_panel) show(settings_panel.el, false);
    for (const e of preview_els.values()) show(e, false);
  };

  const update_view = async () => {
    const tabs = group_tabs(group_id);
    const active = tabs.find((t) => t.active);

    if (!active) {
      last_key = "";
      code_view.clear();
      show(code_view.el, false);
      show(image_host, false);
      hide_diff();
      hide_aux();
      show(empty_state, true);
      return;
    }

    show(empty_state, false);

    if (active.tab_type === "SETTINGS") {
      if (!settings_panel) {
        settings_panel = SettingsPanel();
        settings_panel.el.style.height = "100%";
        body.insertBefore(settings_panel.el, overlay);
      }
      for (const e of preview_els.values()) show(e, false);
      show(settings_panel.el, true);
      show(code_view.el, false);
      show(image_host, false);
      hide_diff();
      last_key = "settings";
      return;
    }

    if (active.tab_type === "PREVIEW") {
      prune_previews();
      if (settings_panel) show(settings_panel.el, false);
      show_preview(active.file_path);
      show(code_view.el, false);
      show(image_host, false);
      hide_diff();
      last_key = `preview:${active.file_path}`;
      return;
    }

    prune_previews();
    hide_aux();

    if (active.tab_type === "EDITOR_DIFF") {
      show(code_view.el, false);
      show(image_host, false);
      last_key = `diff:${active.file_path}`;
      await show_diff(active.file_path);
      return;
    }
    hide_diff();

    if (is_image(active.file_path)) {
      show(code_view.el, false);
      show(image_host, true);
      last_key = `img:${active.file_path}`;
      await render_image(active.file_path);
      return;
    }
    show(image_host, false);
    show(code_view.el, true);

    const key = `${active.file_path}|${active.tab_status}`;
    if (key === last_key) return;
    last_key = key;
    await code_view.open(active.file_path, active.tab_status);
  };

  const zone_for = (e: DragEvent): Zone => {
    const r = body.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    const edge = 0.22;
    if (x < edge) return "left";
    if (x > 1 - edge) return "right";
    if (y < edge) return "top";
    if (y > 1 - edge) return "bottom";
    return "center";
  };

  const RECT: Record<Zone, string> = {
    center: "top:0;left:0;right:0;bottom:0;",
    left: "top:0;left:0;bottom:0;width:50%;",
    right: "top:0;right:0;bottom:0;width:50%;",
    top: "top:0;left:0;right:0;height:50%;",
    bottom: "bottom:0;left:0;right:0;height:50%;",
  };

  let dragging = false;
  const on_doc_dragover = () => {
    if (current_tab_drag() && !dragging) {
      dragging = true;
      overlay.style.pointerEvents = "auto";
    }
  };
  const reset_drag = () => {
    dragging = false;
    overlay.style.pointerEvents = "none";
    highlight.style.display = "none";
  };

  document.addEventListener("dragover", on_doc_dragover);
  document.addEventListener("dragend", reset_drag);
  document.addEventListener("drop", reset_drag);

  overlay.addEventListener("dragover", (e) => {
    if (!current_tab_drag()) return;
    e.preventDefault();
    e.dataTransfer!.dropEffect = "move";
    const zone = zone_for(e);
    highlight.className =
      "absolute z-30 pointer-events-none transition-all duration-75 border border-[var(--focus-border)]";
    highlight.setAttribute(
      "style",
      `position:absolute;z-index:30;background:var(--focus-border);opacity:0.18;${RECT[zone]}`,
    );
  });
  overlay.addEventListener("dragleave", (e) => {
    if (e.target === overlay) highlight.style.display = "none";
  });
  overlay.addEventListener("drop", (e) => {
    e.preventDefault();
    const drag = current_tab_drag();
    const zone = zone_for(e);
    reset_drag();
    if (!drag) return;
    if (zone === "center") dock_into_group(drag, group_id);
    else dock_to_edge(drag, group_id, zone);
  });

  let prev = group_tabs(group_id);
  const unsub = store.subscribe(() => {
    const tabs = group_tabs(group_id);
    if (tabs === prev) return;
    prev = tabs;
    void update_view();
  });

  void update_view();

  return {
    el: root,
    code_view,
    layout: () => code_view.layout(),
    destroy() {
      unsub();
      document.removeEventListener("dragover", on_doc_dragover);
      document.removeEventListener("dragend", reset_drag);
      document.removeEventListener("drop", reset_drag);
      if (image_blob) URL.revokeObjectURL(image_blob);
      tabs_ui.destroy();
      code_view.dispose();
      settings_panel?.destroy();
      settings_panel = null;
      for (const e of preview_els.values()) e.remove();
      preview_els.clear();
      root.remove();
    },
  };
}
