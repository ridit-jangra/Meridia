import { files } from "../../browser/files.js";
import { select } from "../store/selector.js";

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
}

update_status();
