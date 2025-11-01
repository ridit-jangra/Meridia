import { Dark, Light } from "../../platform/themes/themes.js";
import { ITheme, IThemeColors } from "../workbench.types.js";
import { registerStandalone } from "./class.js";
import { tokensToCssVariables } from "./utils.js";

export class Theme {
  private _active!: ITheme;
  private registeredThemes: Map<string, ITheme> = new Map();
  private _mainProcess: boolean;

  constructor(_main?: boolean) {
    this._mainProcess = _main || typeof window === "undefined";

    this.registerThemes([Dark, Light]);

    this._active = this.registeredThemes.get("Dark")!;

    if (!this._mainProcess) {
      this.setTheme("Dark");
    }
  }

  getNodeColor(_token: IThemeColors) {
    if (!this._active?.colors) return "";
    return this._active.colors[_token] || "";
  }

  getColor(_token: IThemeColors) {
    if (this._mainProcess) {
      return this.getNodeColor(_token);
    }

    const _key = tokensToCssVariables[_token];
    const _root = document.documentElement;
    const _value = getComputedStyle(_root).getPropertyValue(_key).trim();
    return _value;
  }

  registerTheme(_theme: ITheme) {
    this.registeredThemes.set(_theme.name, _theme);
  }

  registerThemes(_themes: ITheme[]) {
    _themes.forEach((_theme) => {
      this.registeredThemes.set(_theme.name, _theme);
    });
  }

  getActiveTheme() {
    return this._active as ITheme;
  }

  setTheme(_themeName: string) {
    const _theme = this.registeredThemes.get(_themeName);
    if (!_theme?.colors) return;

    this._active = _theme;

    if (!this._mainProcess) {
      this._applyThemeToDOM(_theme);
    }
  }

  private _applyThemeToDOM(_theme: ITheme) {
    if (this._mainProcess || typeof document === "undefined") return;

    const _root = document.documentElement;

    for (const [key, value] of Object.entries(_theme.colors)) {
      if (!value) continue;
      const varKey = tokensToCssVariables[key as IThemeColors];
      if (varKey) _root.style.setProperty(varKey, value);
    }

    if (_theme.tokenColors) {
      this._setTokenColors(_theme.tokenColors);
    }
  }

  private _setTokenColors(tokenColors: ITheme["tokenColors"]) {
    if (this._mainProcess || typeof document === "undefined") return;
    if (!tokenColors) return;

    const _root = document.documentElement;

    const tokenMapping = {
      "--token-default": tokenColors.default,
      "--token-keyword": tokenColors.keyword,
      "--token-keyword-json": tokenColors["keyword.json"],
      "--token-keyword-type-modifier": tokenColors["keyword.typeModifier"],
      "--token-metadata": tokenColors.metadata,
      "--token-number": tokenColors.number,
      "--token-boolean": tokenColors.boolean,
      "--token-string": tokenColors.string,
      "--token-string-binary": tokenColors["string.binary"],
      "--token-string-escape": tokenColors["string.escape"],
      "--token-string-escape-alternative":
        tokenColors["string.escape.alternative"],
      "--token-string-format-item": tokenColors["string.format.item"],
      "--token-string-regexp": tokenColors["string.regexp"],
      "--token-identifier": tokenColors.identifier,
      "--token-identifier-this": tokenColors["identifier.this"],
      "--token-identifier-constant": tokenColors["identifier.constant"],
      "--token-identifier-variable-local":
        tokenColors["identifier.variable.local"],
      "--token-identifier-parameter": tokenColors["identifier.parameter"],
      "--token-identifier-function-declaration":
        tokenColors["identifier.function.declaration"],
      "--token-identifier-method-static":
        tokenColors["identifier.method.static"],
      "--token-identifier-builtin": tokenColors["identifier.builtin"],
      "--token-identifier-type": tokenColors["identifier.type"],
      "--token-identifier-field": tokenColors["identifier.field"],
      "--token-identifier-field-static": tokenColors["identifier.field.static"],
      "--token-identifier-interface": tokenColors["identifier.interface"],
      "--token-identifier-type-class": tokenColors["identifier.type.class"],
      "--token-comment": tokenColors.comment,
      "--token-comment-parameter": tokenColors["comment.parameter"],
      "--token-punctuation": tokenColors.punctuation,
    };

    for (const [variable, color] of Object.entries({
      ...tokenMapping,
    })) {
      if (color) {
        _root.style.setProperty(variable, color);
      }
    }
  }
}

let _theme: Theme;
if (typeof window !== "undefined") {
  _theme = new Theme();
  registerStandalone("theme", _theme);
}

export { _theme };
