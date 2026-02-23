import { ITab } from "../../src/services/editor/editor.types";

export interface IWorkspace {
  editor_tabs: ITab[];
  name: string;
  path: string;
}
