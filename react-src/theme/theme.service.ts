import { ITheme } from "./theme.types";
import { dark } from "./themes/dark";

type theme_id = string;

export class theme_service {
  private themes: Record<theme_id, ITheme> = {};
  private active_id: theme_id = "dark";
  private style_el: HTMLStyleElement;

  constructor() {
    this.style_el = document.createElement("style");
    this.style_el.id = "theme";
    document.head.appendChild(this.style_el);

    this.register(dark);
    this.apply(this.active_id);
  }

  register(theme: ITheme) {
    this.themes[theme.id] = theme;
  }

  get(theme_id: theme_id) {
    return this.themes[theme_id];
  }

  list() {
    return Object.values(this.themes);
  }

  get_active() {
    return this.get(this.active_id);
  }

  set_active(theme_id: theme_id) {
    if (!this.themes[theme_id]) return;
    this.active_id = theme_id;
    this.apply(theme_id);
  }

  apply(theme_id: theme_id) {
    const theme = this.themes[theme_id];
    if (!theme) return;

    const css_vars = Object.entries(theme.colors!)
      .map(([key, value]) => `--${key.replace(/\./g, "-")}: ${value};`)
      .join("\n");

    this.style_el.innerHTML = `
      :root {
        ${css_vars}
      }
    `;
  }
}

export const theme = new theme_service();
