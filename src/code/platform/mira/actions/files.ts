import { getIcon } from "../../../workbench/common/utils.js";

export function createFile(_folderPath: string, _filePath: string) {
  const _el = document.querySelector(
    `.node[data-node-id="${_folderPath}"`
  ) as HTMLDivElement;
  const _cursor = document.querySelector(".cursor") as HTMLSpanElement;

  if (_el && _cursor) {
    const rect = _el.getBoundingClientRect();

    const targetLeft = rect.left + 16;
    const targetTop = rect.top - 12;

    _cursor.innerHTML = getIcon("cursor/hover.svg");

    _cursor.style.transition = "transform 0.3s ease-out";
    _cursor.style.transform = `translate(${targetLeft}px, ${targetTop}px)`;
  }
}
