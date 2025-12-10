import { _javascriptEmpty } from "../browser/content/javascript/empty.js";
import { _javascriptNextJS } from "../browser/content/javascript/nextjs.js";
import { _javascriptReact } from "../browser/content/javascript/react.js";
import { _pythonDjango } from "../browser/content/python/django.js";
import { _pythonEmpty } from "../browser/content/python/empty.js";
import { _pythonFastAPI } from "../browser/content/python/fastapi.js";
import { _pythonFlask } from "../browser/content/python/flask.js";
import { _typescriptEmpty } from "../browser/content/typescript/empty.js";
import { _typescriptNextJS } from "../browser/content/typescript/nextjs.js";
import { _typescriptReact } from "../browser/content/typescript/react.js";

export const contentMap: Record<string, HTMLElement> = {
  "python-empty": _pythonEmpty.getDomElement()!,
  "python-django": _pythonDjango.getDomElement()!,
  "python-flask": _pythonFlask.getDomElement()!,
  "python-fastapi": _pythonFastAPI.getDomElement()!,

  "ts-empty": _typescriptEmpty.getDomElement()!,
  "ts-react": _typescriptReact.getDomElement()!,
  "ts-next": _typescriptNextJS.getDomElement()!,

  "js-empty": _javascriptEmpty.getDomElement()!,
  "js-react": _javascriptReact.getDomElement()!,
  "js-next": _javascriptNextJS.getDomElement()!,
  // "js-vue": new JsVue().getDomElement()!,
  // "js-svelte": new JsSvelte().getDomElement()!,
};
