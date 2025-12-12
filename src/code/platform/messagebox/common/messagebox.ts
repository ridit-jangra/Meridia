import { Download } from "../browser/download.js";
import { Message } from "../browser/message.js";

export function showDownloadBox(
  title: string,
  message: string,
  command: string,
  args?: string[],
  onCompleteCallback?: Function
) {
  const el = new Download(title, message, command, args, onCompleteCallback);
  el._show();
  document.body.appendChild(el.getDomElement()!);
  return el;
}

export function hideBox(el: Message) {
  el._hide();
  el.getDomElement()!.remove();
}
