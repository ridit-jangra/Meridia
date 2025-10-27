import { _theme } from "../../common/theme.js";

const _color = "var(--workbench-icon-foreground)";

const path = window.path;
const fs = window.fs;

export function getThemeIcon(name: string) {
  const _kind = _theme.getActiveTheme().kind;
  const _folder = path.join([
    path.__dirname,
    "..",
    "workbench",
    "browser",
    "media",
    "icons",
    _kind,
  ]);

  const _path = path.join([_folder, `${name}.svg`]);

  return fs.readFile(_path);
}

export const leftPanelIcon = `<svg viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg" fill="${_color}"><g id="meridia_icon_set" stroke-width="0"></g><g id="meridia_icon_set" stroke-linecap="round" stroke-linejoin="round"></g><g id="meridia_icon_set"> <g fill="none" fill-rule="evenodd" stroke="${_color}" stroke-linecap="round" stroke-linejoin="round" transform="translate(3 3)"> <path d="m2.5.5h10c1.1045695 0 2 .8954305 2 2v10c0 1.1045695-.8954305 2-2 2h-10c-1.1045695 0-2-.8954305-2-2v-10c0-1.1045695.8954305-2 2-2z"></path> <path d="m2.5 11.5v-8"></path> </g> </g></svg>`;

export const rightPanelIcon = `<svg viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg" fill="${_color}"><g id="meridia_icon_set" stroke-width="0"></g><g id="meridia_icon_set" stroke-linecap="round" stroke-linejoin="round"></g><g id="meridia_icon_set"> <g fill="none" fill-rule="evenodd" stroke="${_color}" stroke-linecap="round" stroke-linejoin="round" transform="translate(3 3)"> <path d="m2.5.5h10c1.1045695 0 2 .8954305 2 2v10c0 1.1045695-.8954305 2-2 2h-10c-1.1045695 0-2-.8954305-2-2v-10c0-1.1045695.8954305-2 2-2z"></path> <path d="m12.5 11.5v-8"></path> </g> </g></svg>`;

export const bottomPanelIcon = `<svg viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg" fill="${_color}"><g id="meridia_icon_set" stroke-width="0"></g><g id="meridia_icon_set" stroke-linecap="round" stroke-linejoin="round"></g><g id="meridia_icon_set"> <g fill="none" fill-rule="evenodd" stroke="${_color}" stroke-linecap="round" stroke-linejoin="round" transform="translate(3 3)"> <path d="m2.5.5h10c1.1045695 0 2 .8954305 2 2v10c0 1.1045695-.8954305 2-2 2h-10c-1.1045695 0-2-.8954305-2-2v-10c0-1.1045695.8954305-2 2-2z"></path> <path d="m3.5 12.5h8"></path> </g> </g></svg>`;

export const geminiIcon = `<svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M16 8.016A8.522 8.522 0 008.016 16h-.032A8.521 8.521 0 000 8.016v-.032A8.521 8.521 0 007.984 0h.032A8.522 8.522 0 0016 7.984v.032z" fill="url(#prefix__paint0_radial_980_20147)"/><defs><radialGradient id="prefix__paint0_radial_980_20147" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(16.1326 5.4553 -43.70045 129.2322 1.588 6.503)"><stop offset=".067" stop-color="#9168C0"/><stop offset=".343" stop-color="#5684D1"/><stop offset=".672" stop-color="#1BA1E3"/></radialGradient></defs></svg>`;
