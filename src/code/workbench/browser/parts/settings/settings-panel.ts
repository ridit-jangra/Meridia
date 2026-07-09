import { h } from "../../../contrib/core/dom/h";
import { cn } from "../../../contrib/core/utils/cn";
import { Select } from "../components/select";
import { ScrollArea } from "../components/scroll-area";
import {
  ISettings,
  settings_service,
} from "../../../../platform/settings/settings.service";
import { check_and_install_lsp, check_lsp, LSPS } from "../../lsp";
import { Button } from "../components/button";
import { codicon } from "../components/icon";
import { AI_PROVIDERS } from "../../../../../../shared/ai/catalog";

const MONO = "'JetBrains Mono', monospace";

type Control = { el: HTMLElement; refresh: () => void; destroy?: () => void };

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
  let applying = false;

  const sel = Select({
    items: options.map((o) => ({ value: o.value, label: o.label ?? o.value })),
    value: get(),
    class:
      "!h-[22px] !min-h-0 !py-0 !text-[12px] !rounded-[5px] !border !border-workbench-border",
    onChange: (v) => {
      if (!applying) on_change(v);
    },
  });

  const wrap = h(
    "div",
    { class: "w-[140px]", style: { fontFamily: MONO } },
    sel.el,
  );

  const refresh = () => {
    const v = get();
    if (sel.value === v) return;
    applying = true;
    sel.setValue(v);
    applying = false;
  };

  return { el: wrap, refresh, destroy: () => sel.destroy() };
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
  opts?: { password?: boolean; placeholder?: string },
): Control {
  const input = h("input", {
    class: cn(
      "w-[200px] h-[22px] rounded-[5px] px-2 text-[12px]",
      "bg-select-background text-select-foreground",
      "border border-workbench-border outline-none focus:border-input-focus-border",
    ),
    style: { fontFamily: MONO },
    attrs: {
      type: opts?.password ? "password" : "text",
      spellcheck: false,
      ...(opts?.placeholder ? { placeholder: opts.placeholder } : {}),
    },
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

function lsp_button(
  id: keyof typeof LSPS,
  get: () => "Installed" | "Not Installed",
  on_change: (v: "Installed" | "Not Installed") => void,
): Control {
  const container = h("div", { class: "flex items-center gap-2" });

  const render = (installed: boolean) => {
    container.innerHTML = "";

    if (installed) {
      const status = h(
        "span",
        {
          class:
            "flex items-center gap-1.5 text-[12px] text-green-400/80 select-none",
        },
        codicon("check", "text-[11px]"),
        "Installed",
      );
      container.appendChild(status);
    } else {
      const btn = Button("Checking...", {
        onClick: async () => {
          btn.textContent = "Installing...";
          btn.setAttribute("disabled", "true");
          try {
            await check_and_install_lsp(id);
            on_change("Installed");
            render(true);
          } catch {
            btn.textContent = "Failed";
            btn.removeAttribute("disabled");
          }
        },
      });

      container.appendChild(btn);

      check_lsp(id).then((is_installed) => {
        const status = is_installed ? "Installed" : "Not Installed";
        on_change(status);
        if (is_installed) render(true);
        else btn.textContent = "Install";
      });
    }
  };

  // Bootstrap from persisted settings, then verify with actual check
  render(get() === "Installed");

  return {
    el: container,
    refresh: () => {
      check_lsp(id).then((is_installed) => render(is_installed));
    },
  };
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
        setting_row(
          "Format On Save",
          ctrl(
            toggle(
              () => s().editor_format_on_save,
              (v) => set({ editor_format_on_save: v }),
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
    {
      id: "ai",
      label: "AI",
      rows: [
        setting_row(
          "Provider",
          ctrl(
            select(
              () => s().ai_provider,
              AI_PROVIDERS.map((p) => ({ value: p })),
              (v) => set({ ai_provider: v }),
            ),
          ),
          "Which AI provider the chat agent uses",
        ),
        setting_row(
          "API Key",
          ctrl(
            text_input(
              () => s().ai_api_key,
              (v) => set({ ai_api_key: v.trim() }),
              { password: true, placeholder: "sk-..." },
            ),
          ),
          "Stored locally on this machine. Replaces the .env file.",
        ),
        setting_row(
          "Model",
          ctrl(
            text_input(
              () => s().ai_model,
              (v) => set({ ai_model: v.trim() }),
              { placeholder: "provider/model" },
            ),
          ),
          "Model id sent to the provider (also selectable from the chat box)",
        ),
      ],
    },
    {
      id: "lsp",
      label: "Language Servers",
      rows: [
        setting_row(
          "Auto-Install",
          ctrl(
            toggle(
              () => s().lsp_auto_install,
              (v) => set({ lsp_auto_install: v }),
            ),
          ),
          "Automatically install language servers when opening files that require them",
        ),
        ...Object.entries(LSPS).map(([id, { name }]) => {
          const key = `lsp_${id}` as keyof ISettings;
          return setting_row(
            name,
            ctrl(
              lsp_button(
                id as keyof typeof LSPS,
                () => s()[key] as "Installed" | "Not Installed",
                (v) => set({ [key]: v }),
              ),
            ),
            `Automatically install ${name} when opening files that require it`,
          );
        }),
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
      for (const c of controls) c.destroy?.();
      scroll.destroy();
      el.remove();
    },
  };
}
