import { ipcMain } from "electron";
import { CompletionMira } from "../../platform/mira/suggestions";
import { Storage } from "../services/storage";

export const mira = new CompletionMira(Storage.get("mira-api-key"), {
  provider: "mistral",
  model: "codestral",
});

ipcMain.handle("mira-completion-request", async (_, params) => {
  try {
    const completion = await mira.complete({
      body: params.body,
    });
    return completion;
  } catch (error) {
    console.error("Mira completion error:", error);
    throw error;
  }
});
