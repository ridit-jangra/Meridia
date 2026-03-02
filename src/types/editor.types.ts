import type * as monaco from "monaco-editor";

export type git_badge = "M" | "U" | "I" | "R";
export type git_status = "modified" | "untracked" | "ignored" | "removed";
export type file_status = "problems" | "warnings";
export type cursor_position = {
  line: number;
  col: number;
};
export type tab_status = "EXISTS" | "NEW" | "DELETED";
export type selection = {
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
};

export interface ITab {
  name: string;
  git_badge?: git_badge;
  git_status?: git_status;
  file_status?: file_status;
  tab_status: tab_status;
  file_path: string;
  active: boolean;
  is_touched?: boolean;
}

export interface IMonacoEditor {
  el: HTMLElement;
  parent_el: HTMLElement;
  extensions: string[];
  instance: monaco.editor.IStandaloneCodeEditor;
  dispose: () => void;
}

export interface ICustomEditor {
  parent_el: HTMLElement;
  el: HTMLElement;
  extensions: string[];
  dispose: () => void;
}

export interface ICustomModel {
  uri: string;
  dispose: () => void;
  cursor_position: cursor_position;
}

export interface IMonacoModel {
  uri: string;
  model: monaco.editor.ITextModel;
  dispose: () => void;
  cursor_position: {
    line: number;
    col: number;
  };
  selection?: selection;
}
