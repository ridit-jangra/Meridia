import {
  MERIDIA_FOLDER_PATH,
  PUBLIC_FOLDER,
  PUBLIC_FOLDER_PATH,
  STORE_JSON_PATH,
  USER_FOLDER_PATH,
} from "./utils.js";
import fs from "fs";

const folders = [
  PUBLIC_FOLDER!,
  MERIDIA_FOLDER_PATH,
  USER_FOLDER_PATH,
  PUBLIC_FOLDER_PATH,
];

folders.forEach((folder) => {
  try {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
  } catch (error) {
    throw error;
  }
});

const files = { [STORE_JSON_PATH]: {} };

Object.entries(files).forEach(([filePath, defaultContent]) => {
  if (!fs.existsSync(filePath)) {
    const jsonString = JSON.stringify(defaultContent, null, 2);

    fs.writeFileSync(filePath, jsonString);
  }
});
