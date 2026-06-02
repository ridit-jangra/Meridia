import { git_events } from "../../../platform/events/git.events";

export async function initRepo() {
  const folder_path = await window.workspace.get_current_workspace_path();

  if (!folder_path) return;

  await window.git.initRepo(folder_path);

  git_events.emit("initUi");
}

export async function isRepo() {
  const folder_path = await window.workspace.get_current_workspace_path();
  const isGitRepo = folder_path
    ? await window.git.isGitRepo(folder_path)
    : false;

  return isGitRepo;
}
