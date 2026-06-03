import { h } from "../../../contrib/core/dom/h";
import { cn } from "../../../contrib/core/utils/cn";
import { codicon } from "../components/icon";
import { ScrollArea } from "../components/scroll-area";
import {
  ISettings,
  settings_service,
} from "../../../../platform/settings/settings.service";

const MONO = "'JetBrains Mono', monospace";

type Control = { el: HTMLElement; refresh: () => void };

function toggle(get: () => boolean, on_change: (v: boolean) => void): Control {
  const thumb = h("span", {
    class:
      "absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full transition-all duration-150",
  });

  const track = h(
    "button",
    {
      class:
        "relative w-8 h-4 rounded-full cursor-pointer transition-colors duration-150 shrink-0",
      attrs: { type: "button", role: "switch" },
      on: { click: () => on_change(!get()) },
    },
    thumb,
  );

  const refresh = () => {
    const v = get();
    track.setAttribute("aria-checked", String(v));
    track.style.background = v
      ? "var(--button-primary-background)"
      : "rgba(255,255,255,0.10)";
    thumb.style.left = v ? "calc(100% - 0.875rem)" : "0.125rem";
    thumb.style.background = v ? "var(--button-primary-foreground)" : "#8a8a8a";
  };

  refresh();
  return { el: track, refresh };
}

function select(
  get: () => string,
  options: { value: string; label?: string }[],
  on_change: (v: string) => void,
): Control {
  const sel = h("select", {
    class: cn(
      "appearance-none w-[120px] h-[22px] rounded-[5px] pl-2 pr-6 text-[12px]",
      "bg-select-background text-select-foreground",
      "border border-workbench-border outline-none cursor-pointer",
      "hover:bg-select-hover-background transition-colors",
    ),
    style: { fontFamily: MONO },
    on: { change: () => on_change((sel as HTMLSelectElement).value) },
  }) as HTMLSelectElement;

  for (const opt of options) {
    sel.appendChild(
      h(
        "option",
        { attrs: { value: opt.value }, style: { fontFamily: MONO } },
        opt.label ?? opt.value,
      ),
    );
  }

  const chevron = codicon(
    "chevron-down",
    "absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-[12px] opacity-50",
  );

  const wrap = h(
    "div",
    { class: "relative inline-flex items-center" },
    sel,
    chevron,
  );

  const refresh = () => {
    sel.value = get();
  };

  refresh();
  return { el: wrap, refresh };
}

function number_input(
  get: () => number,
  bounds: { min: number; max: number; step: number },
  on_change: (v: number) => void,
): Control {
  const input = h("input", {
    class: cn(
      "w-[60px] h-[22px] rounded-[5px] px-2 text-[12px] text-right",
      "bg-select-background text-select-foreground",
      "border border-workbench-border outline-none focus:border-input-focus-border",
      "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
    ),
    style: { fontFamily: MONO },
    attrs: {
      type: "number",
      min: bounds.min,
      max: bounds.max,
      step: bounds.step,
    },
    on: {
      change: () => {
        const raw = Number((input as HTMLInputElement).value);
        if (Number.isNaN(raw)) {
          refresh();
          return;
        }
        const clamped = Math.min(bounds.max, Math.max(bounds.min, raw));
        on_change(clamped);
        (input as HTMLInputElement).value = String(clamped);
      },
    },
  }) as HTMLInputElement;

  const refresh = () => {
    input.value = String(get());
  };

  refresh();
  return { el: input, refresh };
}

function text_input(
  get: () => string,
  on_change: (v: string) => void,
): Control {
  const input = h("input", {
    class: cn(
      "w-[200px] h-[22px] rounded-[5px] px-2 text-[12px]",
      "bg-select-background text-select-foreground",
      "border border-workbench-border outline-none focus:border-input-focus-border",
    ),
    style: { fontFamily: MONO },
    attrs: { type: "text", spellcheck: false },
    on: {
      change: () => on_change((input as HTMLInputElement).value),
    },
  }) as HTMLInputElement;

  const refresh = () => {
    if (document.activeElement !== input) input.value = get();
  };

  refresh();
  return { el: input, refresh };
}

function setting_row(name: string, control: Control, description?: string) {
  const label = h(
    "div",
    { class: "flex flex-col min-w-0 pr-4" },
    h("div", { class: "text-[13px] text-editor-tab-active-foreground" }, name),
    description
      ? h(
          "div",
          { class: "text-[11px] mt-0.5 text-editor-tab-foreground" },
          description,
        )
      : null,
  );

  return h(
    "div",
    {
      class:
        "flex items-center justify-between min-h-[40px] px-4 border-b border-workbench-border/60",
    },
    label,
    h("div", { class: "shrink-0 flex items-center" }, control.el),
  );
}

export function SettingsPanel(): { el: HTMLElement; destroy: () => void } {
  const controls: Control[] = [];

  const s = () => settings_service.get();
  const set = (patch: Partial<ISettings>) => void settings_service.save(patch);

  const ctrl = (c: Control) => {
    controls.push(c);
    return c;
  };

  type Section = { id: string; label: string; rows: HTMLElement[] };

  const sections: Section[] = [
    {
      id: "editor",
      label: "Editor",
      rows: [
        setting_row(
          "Font Size",
          ctrl(
            number_input(
              () => s().editor_font_size,
              { min: 8, max: 32, step: 1 },
              (v) => set({ editor_font_size: v }),
            ),
          ),
        ),
        setting_row(
          "Font Family",
          ctrl(
            text_input(
              () => s().editor_font_family,
              (v) => set({ editor_font_family: v }),
            ),
          ),
        ),
        setting_row(
          "Tab Size",
          ctrl(
            select(
              () => String(s().editor_tab_size),
              ["1", "2", "4", "8"].map((v) => ({ value: v })),
              (v) => set({ editor_tab_size: Number(v) }),
            ),
          ),
        ),
        setting_row(
          "Word Wrap",
          ctrl(
            toggle(
              () => s().editor_word_wrap,
              (v) => set({ editor_word_wrap: v }),
            ),
          ),
        ),
        setting_row(
          "Minimap",
          ctrl(
            toggle(
              () => s().editor_minimap,
              (v) => set({ editor_minimap: v }),
            ),
          ),
        ),
        setting_row(
          "Line Numbers",
          ctrl(
            toggle(
              () => s().editor_line_numbers,
              (v) => set({ editor_line_numbers: v }),
            ),
          ),
        ),
        setting_row(
          "Smooth Scrolling",
          ctrl(
            toggle(
              () => s().editor_smooth_scrolling,
              (v) => set({ editor_smooth_scrolling: v }),
            ),
          ),
        ),
        setting_row(
          "Cursor Blinking",
          ctrl(
            select(
              () => s().editor_cursor_blinking,
              ["blink", "smooth", "phase", "expand", "solid"].map((v) => ({
                value: v,
              })),
              (v) => set({ editor_cursor_blinking: v }),
            ),
          ),
        ),
        setting_row(
          "Font Ligatures",
          ctrl(
            toggle(
              () => s().editor_ligatures,
              (v) => set({ editor_ligatures: v }),
            ),
          ),
        ),
      ],
    },
    {
      id: "interface",
      label: "Interface",
      rows: [
        setting_row(
          "Sidebar Position",
          ctrl(
            select(
              () => s().ui_sidebar_position,
              ["left", "right"].map((v) => ({ value: v })),
              (v) => set({ ui_sidebar_position: v as "left" | "right" }),
            ),
          ),
          "Moves the primary sidebar to the other side of the editor",
        ),
        setting_row(
          "Compact Tabs",
          ctrl(
            toggle(
              () => s().ui_compact_tabs,
              (v) => set({ ui_compact_tabs: v }),
            ),
          ),
        ),
        setting_row(
          "Show Breadcrumbs",
          ctrl(
            toggle(
              () => s().ui_show_breadcrumbs,
              (v) => set({ ui_show_breadcrumbs: v }),
            ),
          ),
        ),
      ],
    },
  ];

  const scroll = ScrollArea({ class: "flex-1 min-w-0 min-h-0" });
  scroll.el.classList.add("flex-1", "min-w-0", "min-h-0");
  const content = scroll.viewport;

  const group_els = new Map<string, HTMLElement>();

  for (const section of sections) {
    const group = h(
      "div",
      { class: "pt-3" },
      h(
        "div",
        {
          class:
            "px-4 pb-2 text-[11px] uppercase tracking-[0.12em] text-editor-tab-foreground/80",
        },
        section.label,
      ),
      ...section.rows,
    );
    group_els.set(section.id, group);
    scroll.inner.appendChild(group);
  }

  let active_section = sections[0].id;
  const nav_items = new Map<string, HTMLElement>();

  const set_active = (id: string) => {
    active_section = id;
    for (const [sid, item] of nav_items) {
      const on = sid === id;
      item.classList.toggle("bg-explorer-item-active-background", on);
      item.classList.toggle("text-explorer-item-active-foreground", on);
      item.classList.toggle("text-editor-tab-foreground", !on);
    }

    for (const [sid, g] of group_els) {
      g.style.display = sid === id ? "" : "none";
    }
    content.scrollTop = 0;
  };

  const nav = h("div", {
    class: "w-[180px] shrink-0 border-r border-workbench-border py-1.5",
  });

  for (const section of sections) {
    const item = h(
      "div",
      {
        class: cn(
          "h-[32px] flex items-center pl-3 text-[13px] cursor-pointer select-none",
          "hover:bg-explorer-item-hover-background hover:text-explorer-item-hover-foreground",
        ),
        style: { fontFamily: MONO },
        on: {
          click: () => set_active(section.id),
        },
      },
      section.label,
    );
    nav_items.set(section.id, item);
    nav.appendChild(item);
  }

  set_active(active_section);

  const unsubscribe = settings_service.subscribe(() => {
    for (const c of controls) c.refresh();
  });

  const el = h(
    "div",
    {
      class:
        "flex h-full w-full min-h-0 bg-panel-background text-panel-foreground",
    },
    nav,
    scroll.el,
  );

  return {
    el,
    destroy() {
      unsubscribe();
      scroll.destroy();
      el.remove();
    },
  };
}
