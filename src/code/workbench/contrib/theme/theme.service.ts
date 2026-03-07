import { ITheme, TColors, TToken } from "../../../../types/theme.types";
import { dark, light } from "./themes";

type theme_id = string;

const is_electron = (): boolean =>
  typeof window !== "undefined" &&
  typeof (window as any).electronAPI !== "undefined";

const inject_css = (style_el: HTMLStyleElement, css: string) => {
  style_el.innerHTML = css;
};

export class theme_service {
  private themes: Record<theme_id, ITheme> = {};
  private active_id: theme_id = "light";
  private style_el: HTMLStyleElement;

  constructor() {
    this.style_el = this.create_style_el();

    this.register(dark);
    this.register(light);

    this.apply(this.active_id);
  }

  private create_style_el(): HTMLStyleElement {
    if (typeof document === "undefined") {
      return { id: "", innerHTML: "" } as unknown as HTMLStyleElement;
    }

    const existing = document.getElementById(
      "theme",
    ) as HTMLStyleElement | null;
    if (existing) return existing;

    const el = document.createElement("style");
    el.id = "theme";
    document.head.appendChild(el);
    return el;
  }

  register(theme: ITheme) {
    this.themes[theme.id] = theme;
  }

  get(id: theme_id) {
    return this.themes[id];
  }

  list() {
    return Object.values(this.themes);
  }

  get_active() {
    return this.get(this.active_id);
  }

  get_color(key: TColors, fromCSS?: false): string | undefined;
  get_color(key: string, fromCSS: true): string;
  get_color(key: string, fromCSS = false): string | undefined {
    if (!fromCSS) {
      return this.get_active()?.colors?.[key as TColors];
    }

    if (typeof document === "undefined") return "";

    const cssVar = `--${key.replace(/\./g, "-")}`;
    return getComputedStyle(document.documentElement)
      .getPropertyValue(cssVar)
      .trim();
  }

  set_active(id: theme_id) {
    if (!this.themes[id]) return;
    this.active_id = id;
    this.apply(id);

    if (is_electron()) {
      try {
        (window as any).electronAPI?.send?.("theme:changed", id);
      } catch {}
    }
  }

  apply(id: theme_id) {
    const theme = this.themes[id];
    if (!theme) return;

    const css_vars = Object.entries(theme.colors ?? {})
      .map(([key, value]) => `--${key.replace(/\./g, "-")}: ${value};`)
      .join("\n");

    const token_vars = Object.entries(theme.tokens ?? {})
      .map(([key, value]) => `--token-${key.replace(/\./g, "-")}: ${value};`)
      .join("\n");

    const css = `
      :root {
        ${css_vars}
        ${token_vars}
      }
    `;

    inject_css(this.style_el, css);

    if (is_electron()) {
      try {
        (window as any).electronAPI?.applyThemeCSS?.(css);
      } catch {}
    }
  }

  get_token(key: TToken): string | undefined {
    return this.get_active()?.tokens?.[key as TToken];
  }

  sync_from_ipc(id: theme_id) {
    if (!this.themes[id]) return;
    this.active_id = id;
    this.apply(id);
  }
}

export const theme = new theme_service();
