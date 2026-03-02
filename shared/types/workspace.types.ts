import { ITab } from "../../src/types/editor.types";
import { IPersistedTerminalTab } from "../../src/types/terminal.types";

export interface IWorkspace {
  editor_tabs: ITab[];
  terminal_tabs: IPersistedTerminalTab[];
  name: string;
  path: string;
}
