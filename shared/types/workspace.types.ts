import { ITab } from "../../src/services/editor/editor.types";
import { IPersistedTerminalTab } from "../../src/services/terminal/terminal.types";

export interface IWorkspace {
  editor_tabs: ITab[];
  terminal_tabs: IPersistedTerminalTab[];
  name: string;
  path: string;
}
