import { select } from "../../../common/store/selector.js";
import { update_editor_tabs } from "../../../common/store/slice.js";
import { dispatch } from "../../../common/store/store.js";
import { getFileIcon } from "../../../common/utils.js";
import { IEditorTab, IFolderStructure } from "../../../workbench.types.js";
import { getThemeIcon } from "../../media/icons.js";
import { CoreEl } from "../core.js";

const path = window.path;

export class CommandPanel extends CoreEl {
  private _selectedIndex: number = 0;
  private _currentFolderStructure: IFolderStructure | null = null;
  private _optionsEl: HTMLDivElement | null = null;
  private _input: HTMLInputElement | null = null;
  private _active: boolean = false;

  constructor() {
    super();
    this._createEl();
  }

  async _createEl() {
    this._el = document.createElement("div");
    this._el.className = "command-panel widget";

    const _searchEl = document.createElement("div");
    _searchEl.className = "search";

    this._input = document.createElement("input");
    this._input.type = "text";
    this._input.placeholder = "Search commands, files, operations, etc.";

    _searchEl.appendChild(this._input);

    this._optionsEl = document.createElement("div");
    this._optionsEl.className = "options scrollbar-container x-disable";

    this._currentFolderStructure = select((s) => s.main.folder_structure);
    this._renderOptions(this._currentFolderStructure);

    this._el.appendChild(_searchEl);
    this._el.appendChild(this._optionsEl);

    setTimeout(() => {
      this._input!.focus();
    }, 200);
  }

  private _renderOptions(folderStructure: IFolderStructure) {
    if (!this._optionsEl) return;

    this._optionsEl.innerHTML = "";
    this._selectedIndex = 0;

    const files = folderStructure.children || [];

    if (folderStructure.uri !== select((s) => s.main.folder_structure).uri) {
      const _backEl = document.createElement("div");
      _backEl.className = "option";
      _backEl.dataset.index = "-1";
      _backEl.addEventListener("click", () => this._selectOption(-1));
      _backEl.addEventListener("mouseenter", () => {
        this._selectedIndex = -1;
        this._updateSelection();
      });

      const _nameEl = document.createElement("div");
      _nameEl.className = "name";

      const _icon = document.createElement("span");
      _icon.innerHTML = getThemeIcon("undo");
      _icon.className = "icon";

      const _text = document.createElement("span");
      _text.textContent = "Back";
      _text.className = "text";

      const _path = document.createElement("span");
      _path.textContent = "Go back";
      _path.className = "detail";

      _nameEl.appendChild(_icon);
      _nameEl.appendChild(_text);

      _backEl.appendChild(_nameEl);
      _backEl.appendChild(_path);

      this._optionsEl!.appendChild(_backEl);
    }

    files.forEach((_file, index) => {
      const _fileEl = document.createElement("div");
      _fileEl.className = "option";
      _fileEl.dataset.index = index.toString();
      _fileEl.addEventListener("click", () => this._selectOption(index));
      _fileEl.addEventListener("mouseenter", () => {
        this._selectedIndex = index;
        this._updateSelection();
      });

      const _nameEl = document.createElement("div");
      _nameEl.className = "name";

      const _icon = document.createElement("span");
      _icon.innerHTML =
        _file.type === "file"
          ? getFileIcon(_file.name)
          : getThemeIcon("folder");
      _icon.className = "icon";

      const _text = document.createElement("span");
      _text.textContent = _file.name;
      _text.className = "text";

      const _path = document.createElement("span");
      _path.textContent = _file.uri;
      _path.className = "detail";

      _nameEl.appendChild(_icon);
      _nameEl.appendChild(_text);

      _fileEl.appendChild(_nameEl);
      _fileEl.appendChild(_path);

      this._optionsEl!.appendChild(_fileEl);
    });

    this._updateSelection();
  }

  private _updateSelection() {
    const options = this._optionsEl?.querySelectorAll(".option");
    options?.forEach((option, index) => {
      if (index === this._selectedIndex) {
        option.classList.add("selected");
      } else {
        option.classList.remove("selected");
      }
    });
  }

  private _selectOption(index: number) {
    const files = this._currentFolderStructure?.children || [];
    const selected = files[index];

    console.log(index);

    if (index === -1) {
      this._renderOptions(select((s) => s.main.folder_structure));
      return;
    }

    if (selected && selected.type === "folder") {
      this._currentFolderStructure = selected;
      this._renderOptions(selected);

      this._input?.focus();
    } else if (selected && selected.type === "file") {
      const stateValue = select((s) => s.main.editor_tabs);
      const _uri = path.normalize(selected.uri);

      let currentTabs: IEditorTab[] = [];

      if (Array.isArray(stateValue)) {
        currentTabs = stateValue;
      } else if (stateValue && typeof stateValue === "object") {
        currentTabs = Object.values(stateValue);
      }

      const existingTabIndex = currentTabs.findIndex((tab) => tab.uri === _uri);

      if (existingTabIndex !== -1) {
        const updatedTabs = currentTabs.map((tab, index) => ({
          ...tab,
          active: index === existingTabIndex,
        }));

        dispatch(update_editor_tabs(updatedTabs));
      } else {
        const newTab: IEditorTab = {
          name: selected.name,
          uri: _uri,
          active: true,
          is_touched: false,
        };

        const updatedTabs = [
          ...currentTabs.map((tab) => ({
            ...tab,
            active: false,
          })),
          newTab,
        ];

        dispatch(update_editor_tabs(updatedTabs));
      }
    }
  }

  _show() {
    this._el!.style.display = "flex";
    this._active = true;
  }

  _hide() {
    this._el!.style.display = "none";
    this._active = false;
  }

  _toggle() {
    if (this._active) this._hide();
    else this._show();
  }
}

export const _commandPanel = new CommandPanel();
