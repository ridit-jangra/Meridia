import { select } from "../common/store/selector.js";
import { CoreEl } from "./parts/core.js";
import { Tooltip } from "./parts/tooltip/tooltip.js";

export class Git extends CoreEl {
  private changesList!: HTMLDivElement;
  private input!: HTMLInputElement;
  private commitButton!: HTMLSpanElement;
  private notAdded: string[] = [];
  private modified: string[] = [];
  private isCommitting: boolean = false;

  constructor() {
    super();

    this._createEl();
  }

  private _createEl() {
    this._el = document.createElement("div");
    this._el.className = "git";

    const commitInput = document.createElement("div");
    commitInput.className = "input";

    this.input = document.createElement("input");
    this.input.placeholder = "Message to commit";

    this.input.addEventListener("input", () => this.updateCommitButtonState());

    commitInput.appendChild(this.input);

    this.commitButton = new Tooltip()._getEl(
      document.createElement("span"),
      "Commit Changes",
      "top",
    );
    this.commitButton.textContent = "Commit";
    this.commitButton.className = "commit-btn disabled";

    this.commitButton.addEventListener("click", () => this.commit_changes());

    const changesDiv = document.createElement("div");
    changesDiv.className = "changes";

    const changesTitle = document.createElement("span");
    changesTitle.className = "title";
    changesTitle.textContent = "Changes";

    this.changesList = document.createElement("div");
    this.changesList.className = "changes-list scrollbar-container x-disable";

    changesDiv.appendChild(changesTitle);
    changesDiv.appendChild(this.changesList);

    this._el.appendChild(commitInput);
    this._el.appendChild(this.commitButton);
    this._el.appendChild(changesDiv);
  }

  private updateCommitButtonState() {
    const hasMessage = this.input.value.trim().length > 0;
    const hasChanges = this.notAdded.length > 0 || this.modified.length > 0;

    if (hasMessage && hasChanges && !this.isCommitting) {
      this.commitButton.classList.remove("disabled");
    } else {
      this.commitButton.classList.add("disabled");
    }
  }

  async commit_changes() {
    if (this.isCommitting) return;

    const message = this.input.value.trim();
    if (!message) return;

    const folder_structure = select((s) => s.main.folder_structure);

    if (!folder_structure?.uri) return;

    const files = [...this.notAdded, ...this.modified];

    if (files.length === 0) return;

    this.isCommitting = true;
    this.commitButton.classList.add("loading");
    this.commitButton.classList.remove("disabled");
    this.commitButton.textContent = "Committing...";
    this.input.disabled = true;

    try {
      await window.git.commit(message, folder_structure.uri, files);
      this.input.value = "";
      this.updateCommitButtonState();
    } catch (error) {
      console.error("Commit failed:", error);
    } finally {
      this.isCommitting = false;
      this.commitButton.classList.remove("loading");
      this.commitButton.textContent = "Commit";
      this.input.disabled = false;
      this.updateCommitButtonState();
    }
  }

  update_changes_list(
    notAdded: string[],
    modified: string[],
    ignored: string[],
  ) {
    this.notAdded = notAdded;
    this.modified = modified;

    this.changesList.innerHTML = "";
    this.changesList.classList.add("loading");

    const loadingEl = document.createElement("div");
    loadingEl.className = "loading-spinner";
    loadingEl.textContent = "Loading changes...";
    this.changesList.appendChild(loadingEl);

    setTimeout(() => {
      this.changesList.classList.remove("loading");
      this.changesList.innerHTML = "";

      const createFileItem = (
        filePath: string,
        status: string,
        badge: string,
      ) => {
        const item = document.createElement("div");
        item.className = `file-item ${status}`;

        const badgeEl = document.createElement("span");
        badgeEl.className = "badge";
        badgeEl.textContent = badge;

        const fileName = new Tooltip()._getEl(
          document.createElement("span"),
          `${filePath} • ${status}`,
          "bottom",
          500,
        );
        fileName.className = "file-name";
        fileName.textContent = window.path.basename(filePath);

        item.appendChild(fileName);
        item.appendChild(badgeEl);

        return item;
      };

      notAdded.forEach((filePath) => {
        const item = createFileItem(filePath, "untracked", "U");
        this.changesList.appendChild(item);
      });

      modified.forEach((filePath) => {
        const item = createFileItem(filePath, "modified", "M");
        this.changesList.appendChild(item);
      });

      if (notAdded.length === 0 && modified.length === 0) {
        const noChanges = document.createElement("div");
        noChanges.className = "no-changes";
        noChanges.textContent = "No changes";
        this.changesList.appendChild(noChanges);
        this.commitButton.classList.add("disabled");
      }

      this.updateCommitButtonState();
    }, 0);
  }
}

export const git = new Git();
