export interface TabDragPayload {
  file_path: string;
  from_group_id: string;
}

export const TAB_DND_MIME = "application/x-meridia-tab";

let _current: TabDragPayload | null = null;

export function begin_tab_drag(payload: TabDragPayload): void {
  _current = payload;
}

export function end_tab_drag(): void {
  _current = null;
}

export function current_tab_drag(): TabDragPayload | null {
  return _current;
}

export interface ViewDragPayload {
  view_id: string;
}

export const VIEW_DND_MIME = "application/x-meridia-view";

let _view: ViewDragPayload | null = null;

export function begin_view_drag(payload: ViewDragPayload): void {
  _view = payload;
}

export function end_view_drag(): void {
  _view = null;
}

export function current_view_drag(): ViewDragPayload | null {
  return _view;
}
