import { files } from "../../browser/files.js";
import { select } from "../store/selector.js";
import { dispatch } from "../store/store.js";
import { update_editor_tabs } from "../store/slice.js";
import { IEditorTab } from "../../workbench.types.js";
import { git } from "../../browser/git.js";

export async function update_status() {
  const folder_structure = select((s) => s.main.folder_structure);

  if (!folder_structure || !folder_structure.uri) return;

  const baseFolder = folder_structure.uri;

  const status = await window.git.getStatus(baseFolder);

  let not_added: string[] = [];
  let modified: string[] = [];
  let ignored: string[] = [];

  status.not_added.map((v) => {
    const new_v = window.path.join([baseFolder, v]);
    not_added.push(new_v);
  });

  status.modified.map((v) => {
    const new_v = window.path.join([baseFolder, v]);
    modified.push(new_v);
  });

  if (status.ignored) {
    status.ignored?.map((v) => {
      const new_v = window.path.join([baseFolder, v]);
      ignored.push(new_v);
    });
  }

  files._renderer.updateGitStatus(not_added, modified, ignored);
  updateEditorTabsStatus(not_added, modified, ignored);

  git.update_changes_list(not_added, modified, ignored);
}

function updateEditorTabsStatus(
  notAdded: string[],
  modified: string[],
  ignored: string[],
) {
  const stateValue = select((s) => s.main.editor_tabs);
  let currentTabs: IEditorTab[] = [];

  if (Array.isArray(stateValue)) {
    currentTabs = stateValue;
  } else if (stateValue && typeof stateValue === "object") {
    currentTabs = Object.values(stateValue);
  }

  if (currentTabs.length === 0) return;

  const normalizePath = (path: string) => path.replace(/\\/g, "/");

  const notAddedSet = new Set(notAdded.map(normalizePath));
  const modifiedSet = new Set(modified.map(normalizePath));
  const ignoredSet = new Set(ignored.map(normalizePath));

  const updatedTabs = currentTabs.map((tab) => {
    const normalizedUri = normalizePath(tab.uri);

    let newStatus: IEditorTab["status"] = "default";
    let newBadge: IEditorTab["badge"] = "D";

    if (notAddedSet.has(normalizedUri)) {
      newStatus = "untracked";
      newBadge = "U";
    } else if (modifiedSet.has(normalizedUri)) {
      newStatus = "modified";
      newBadge = "M";
    } else if (ignoredSet.has(normalizedUri)) {
      newStatus = "ignored";
      newBadge = "I";
    }

    if (tab.status !== newStatus) {
      return { ...tab, status: newStatus, badge: newBadge };
    }

    return tab;
  });

  const hasChanged = updatedTabs.some(
    (tab, index) => tab.status !== currentTabs[index]?.status,
  );

  if (hasChanged) {
    dispatch(update_editor_tabs(updatedTabs));
  }
}

update_status();

window.ipc.on("git-folder-update", (event: any) => {
  update_status();
});
