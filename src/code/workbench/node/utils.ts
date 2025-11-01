import path from "path";

export const PUBLIC_FOLDER =
  process.platform === "win32"
    ? process.env.APPDATA
    : path.join(process.env.HOME!, ".config");

export const MERIDIA_FOLDER_PATH =  path.join(PUBLIC_FOLDER!, "Meridia");

export const USER_FOLDER_PATH =  path.join(MERIDIA_FOLDER_PATH, "User");

export const PUBLIC_FOLDER_PATH = USER_FOLDER_PATH

export const STORE_JSON_PATH = path.join(PUBLIC_FOLDER_PATH, "store.json");
