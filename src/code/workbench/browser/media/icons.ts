import { _theme } from "../../common/theme.js";

const path = window.path;
const fs = window.fs;

const iconCache = new Map<string, string>();

_theme.onThemeChange(() => {
  iconCache.clear();
  updateAllThemeIcons();
});

export function getIcon(name: string) {
  try {
    const _kind = _theme.getActiveTheme().kind;
    const themeName = _theme.getActiveTheme().name;
    const cacheKey = `${themeName}-${name}`;

    if (iconCache.has(cacheKey)) {
      return iconCache.get(cacheKey)!;
    }

    const _folder = path.join([
      path.__dirname,
      "..",
      "browser",
      "media",
      "icons",
      _kind,
    ]);

    const _path = path.join([_folder, `${name}.svg`]);

    if (!fs.exists(_path)) return null;

    const svgContent = fs.readFile(_path);
    iconCache.set(cacheKey, svgContent);
    return svgContent;
  } catch {
    return null;
  }
}

export function updateAllThemeIcons() {
  const icons = document.querySelectorAll("[data-theme-icon]");
  icons.forEach((element) => {
    const iconName = element.getAttribute("data-theme-icon");
    if (iconName) {
      element.innerHTML = getIcon(iconName)!;
    }
  });
}

export function getThemeIcon(iconName: string, className?: string) {
  const svg = getIcon(iconName);
  if (!svg) return document.createElement("div");

  const container = document.createElement("span");
  container.setAttribute("data-theme-icon", iconName);
  if (className) container.classList.add(className);

  container.innerHTML = svg;
  return container;
}

const _color = "currentColor";

export const leftPanelIconOn = `<svg fill="${_color}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" enable-background="new 0 0 52 52" xml:space="preserve"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M46,8H6c-1.1,0-2,0.9-2,2v32c0,1.1,0.9,2,2,2h40c1.1,0,2-0.9,2-2V10C48,8.9,47.1,8,46,8z M44,40H8V12h36V40z "></path> <path d="M21,38h-9.9c-0.6,0-1-0.4-1-1V15c0-0.6,0.4-1,1-1H21c0.6,0,1,0.4,1,1v22C22,37.6,21.6,38,21,38z"></path> </g></svg>`;

export const leftPanelIconOff = `<svg fill="${_color}" viewBox="0 0 32 32" id="icon" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><defs><style>.cls-1{fill:none;}</style></defs><title>open-panel--left</title><path d="M28,4H4A2,2,0,0,0,2,6V26a2,2,0,0,0,2,2H28a2,2,0,0,0,2-2V6A2,2,0,0,0,28,4ZM4,6h6V26H4ZM28,26H12V6H28Z"></path><rect id="_Transparent_Rectangle_" data-name="&lt;Transparent Rectangle&gt;" class="cls-1" width="32" height="32"></rect></g></svg>`;

export const bottomPanelIconOn = `<svg fill="${_color}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" enable-background="new 0 0 52 52" xml:space="preserve"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M46,8H6c-1.1,0-2,0.9-2,2v32c0,1.1,0.9,2,2,2h40c1.1,0,2-0.9,2-2V10C48,8.9,47.1,8,46,8z M44,40H8V12h36V40z "></path> <path d="M41,38H11.1c-0.6,0-1-0.4-1-1V27c0-0.6,0.4-1,1-1H41c0.6,0,1,0.4,1,1v10C42,37.6,41.6,38,41,38z"></path> </g></svg>`;

export const bottomPanelIconOff = `<svg fill="${_color}" viewBox="0 0 32 32" id="icon" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><defs><style>.cls-1{fill:none;}</style></defs><title>open-panel--bottom</title><path d="M28,4H4A2,2,0,0,0,2,6V26a2,2,0,0,0,2,2H28a2,2,0,0,0,2-2V6A2,2,0,0,0,28,4Zm0,2V18H4V6ZM4,26V20H28v6Z"></path><rect id="_Transparent_Rectangle_" data-name="&lt;Transparent Rectangle&gt;" class="cls-1" width="32" height="32"></rect></g></svg>`;

export const leftPanelIcon = leftPanelIconOn;
export const bottomPanelIcon = bottomPanelIconOn;
