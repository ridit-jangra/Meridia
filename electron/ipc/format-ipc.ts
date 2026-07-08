import { ipcMain } from "electron";
import { FORMAT_DOCUMENT } from "../../shared/ipc/channels";
import {
  format_document,
  type FormatOptions,
} from "../main-services/format-service";

ipcMain.handle(
  FORMAT_DOCUMENT,
  async (_, file_path: string, text: string, options: FormatOptions) => {
    return format_document(file_path, text, options);
  },
);
