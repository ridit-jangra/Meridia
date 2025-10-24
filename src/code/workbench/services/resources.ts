import monacoStyling from "monaco-editor/dev/vs/editor/editor.main.css";
import xtermStyling from "@xterm/xterm/css/xterm.css";

const _injectStyle = (cssText: string) => {
  const style = document.createElement("style");
  style.innerHTML = cssText;
  document.head.appendChild(style);
};

_injectStyle(monacoStyling);
_injectStyle(xtermStyling);
