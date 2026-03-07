import { IClipboardProvider } from "@xterm/addon-clipboard";

export class ClipboardProvider implements IClipboardProvider {
  async readText(): Promise<string> {
    return navigator.clipboard.readText();
  }
  async writeText(_: any, data: string): Promise<void> {
    navigator.clipboard.writeText(data);
  }
}

export class Base64Provider {
  encodeText(data: string): string {
    return btoa(unescape(encodeURIComponent(data)));
  }
  decodeText(data: string): string {
    return decodeURIComponent(escape(atob(data)));
  }
}
