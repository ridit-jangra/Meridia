import { shell } from "electron";

export const electronBridge = {
  shell: {
    ...shell,
  },
};
