import { ITab } from "../../src/types/editor.types";
import { IPersistedTerminalTab } from "../../src/types/terminal.types";
import type {
  EditorGroup,
  GridNode,
} from "../../src/code/workbench/contrib/editor/group/grid";

export interface IPersistedEditorLayout {
  groups: EditorGroup[];
  grid: GridNode;
  active_group_id: string;
}

export interface IWorkspace {
  editor_tabs: ITab[];
  editor_layout?: IPersistedEditorLayout;
  terminal_tabs: IPersistedTerminalTab[];
  name: string;
  path: string;
  open_folders: string[];
}
