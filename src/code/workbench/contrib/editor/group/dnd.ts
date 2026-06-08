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
