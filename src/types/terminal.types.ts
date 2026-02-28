import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";

export interface ITerminalTab {
  id: string;
  name: string;
  terminal: Terminal;
  fitAddon: FitAddon;
  active: boolean;
  el: HTMLElement;
}

export interface IPersistedTerminalTab {
  id: string;
  name: string;
  active: boolean;
}
