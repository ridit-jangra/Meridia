import { Terminal, ITerminalAddon, IDisposable } from "@xterm/xterm";
import { Tooltip } from "../../../workbench/browser/parts/components/tooltip";
import { Link } from "../../../workbench/browser/parts/components/link";
import { h } from "../../../workbench/contrib/core/dom/h";

export interface IFileLinksAddonOptions {
  onOpen: (path: string, location?: { line: number; col: number }) => void;
  resolvePath?: (raw: string) => string | null;
}

const FILE_REGEX = /(?:[a-zA-Z]:[/\\]|[./]{1,2}[/\\]|\/)[^\n"'`|<>{}()[\]]+/g;

const LOCATION_REGEX = /:(\d+)(?::(\d+))?$/;

export class FileLinksAddon implements ITerminalAddon {
  private _terminal: Terminal | undefined;
  private _disposables: IDisposable[] = [];

  private _linkAnchor: HTMLDivElement;
  private _followLink: HTMLAnchorElement;
  private _linkTooltip: ReturnType<typeof Tooltip>;

  constructor(private readonly _opts: IFileLinksAddonOptions) {
    this._linkAnchor = document.createElement("div");
    this._linkAnchor.style.cssText =
      "position:fixed;width:1px;height:1px;pointer-events:none;";
    document.body.appendChild(this._linkAnchor);

    this._followLink = Link({ text: "Open / Highlight", class: "text-lg" })
      .el as HTMLAnchorElement;

    this._linkTooltip = Tooltip({
      content: h(
        "div",
        { class: "flex items-center gap-2 text-lg" },
        this._followLink,
        h("span", {}, "(ctrl+click)"),
      ),
      child: this._linkAnchor,
      position: "top",
      delay: 100,
      hide_delay: 200,
      class: "-translate-y-2",
    });
  }

  activate(terminal: Terminal): void {
    this._terminal = terminal;
    this._disposables.push(
      terminal.registerLinkProvider({
        provideLinks: (y, callback) => {
          const [line, startY] = this._translateBufferLineToStringWithWrap(
            y - 1,
          );
          if (!line) return callback([]);

          const links: any[] = [];

          FILE_REGEX.lastIndex = 0;
          let match: RegExpExecArray | null;

          while ((match = FILE_REGEX.exec(line)) !== null) {
            const rawMatch = match[0];
            const matchIndex = match.index;

            const locationMatch = LOCATION_REGEX.exec(rawMatch);
            const barePath = locationMatch
              ? rawMatch.slice(0, -locationMatch[0].length)
              : rawMatch;

            const location = locationMatch
              ? {
                  line: parseInt(locationMatch[1], 10),
                  col: locationMatch[2] ? parseInt(locationMatch[2], 10) : 1,
                }
              : undefined;

            const resolved = this._opts.resolvePath
              ? this._opts.resolvePath(barePath)
              : barePath;

            if (!resolved) continue;

            const range = this._bufferRangeForMatch(
              matchIndex,
              rawMatch.length,
              startY,
            );
            if (!range) continue;

            links.push({
              range,
              text: rawMatch,
              activate: (event: MouseEvent) => {
                if (event.ctrlKey) this._opts.onOpen(resolved, location);
              },
              hover: (event: MouseEvent) => {
                this._followLink.onclick = () =>
                  this._opts.onOpen(resolved, location);
                this._linkAnchor.style.left = `${event.clientX}px`;
                this._linkAnchor.style.top = `${event.clientY}px`;
                this._linkAnchor.dispatchEvent(
                  new MouseEvent("mouseenter", { bubbles: false }),
                );
              },
              leave: () => {
                this._linkAnchor.dispatchEvent(
                  new MouseEvent("mouseleave", { bubbles: false }),
                );
              },
            });
          }

          callback(links);
        },
      }),
    );
  }

  dispose(): void {
    this._disposables.forEach((d) => d.dispose());
    this._disposables = [];
    this._terminal = undefined;
    this._linkTooltip.destroy();
    this._linkAnchor.remove();
  }

  private _translateBufferLineToStringWithWrap(
    lineIndex: number,
  ): [string, number] {
    if (!this._terminal) return ["", lineIndex];

    const buffer = this._terminal.buffer.active;
    let startIndex = lineIndex;

    while (startIndex > 0 && buffer.getLine(startIndex - 1)?.isWrapped) {
      startIndex--;
    }

    let result = "";
    let i = startIndex;

    while (i < buffer.length) {
      const line = buffer.getLine(i);
      if (!line) break;
      result += line.translateToString(i === startIndex ? true : false);
      if (!line.isWrapped) break;
      i++;
    }

    return [result, startIndex];
  }

  private _bufferRangeForMatch(
    charIndex: number,
    length: number,
    startLineIndex: number,
  ): { start: { x: number; y: number }; end: { x: number; y: number } } | null {
    if (!this._terminal) return null;

    const cols = this._terminal.cols;

    const startRow = startLineIndex + Math.floor(charIndex / cols);
    const startCol = (charIndex % cols) + 1;

    const endIndex = charIndex + length - 1;
    const endRow = startLineIndex + Math.floor(endIndex / cols);
    const endCol = (endIndex % cols) + 2;

    return {
      start: { x: startCol, y: startRow + 1 },
      end: { x: endCol, y: endRow + 1 },
    };
  }
}
