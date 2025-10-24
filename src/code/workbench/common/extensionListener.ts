import { Editor } from "../../editor/standalone/standalone.js";
import { _contextEvent } from "../../platform/extension/common/context.js";
import {
  registerStatusbarItem,
  removeStatusbarItem,
} from "../event/statusbar.js";
import { IEditorTab, IStatusBarAction } from "../types.js";

import { getStandalone } from "./standalone.js";
import { dispatch } from "./store/store.js";
import { select } from "./store/selector.js";
import { update_editor_tabs } from "./store/slice.js";

_contextEvent.on(
  "workbench.statusbar.register.action",
  (_action: IStatusBarAction) => {
    const _item = document.createElement("span");
    _item.innerHTML = _action._name;
    _item.onclick = () => _action._action();

    if (_action._condition === "workbench.editor.open") {
      document.addEventListener("workbench.editor.on.open", () => {
        registerStatusbarItem(_item);
      });

      document.addEventListener("workbench.editor.on.close", () => {
        removeStatusbarItem(_item.innerHTML);
      });
    } else if (_action._condition === "workbench.editor.open.file") {
      document.addEventListener("workbench.editor.on.open", () => {
        registerStatusbarItem(_item);
      });

      document.addEventListener("workbench.editor.on.close", () => {
        removeStatusbarItem(_item.innerHTML);
      });
    } else {
      registerStatusbarItem(_item);
    }
  }
);

_contextEvent.on("workbench.statusbar.remove.action", (_innerHtml: string) => {
  removeStatusbarItem(_innerHtml);
});

_contextEvent.on("workbench.editor.save.active.file", () => {
  const _editor = getStandalone("editor") as Editor;

  if (_editor) {
    const _uri = _editor._editor.getModel()!.uri;

    if (_uri) {
      _editor._save(_uri.path);
    }
  }
});

_contextEvent.on("workbench.editor.get.active.file", () => {
  const _tabs = select((s) => s.main.editor_tabs);
  const _active = _tabs.find((t) => t.active);

  return _active;
});

_contextEvent.on("workbench.editor.open.file", (_file: IEditorTab) => {
  const stateValue = select((s) => s.main.editor_tabs);

  let currentTabs: IEditorTab[] = [];

  if (Array.isArray(stateValue)) {
    currentTabs = stateValue;
  } else if (stateValue && typeof stateValue === "object") {
    currentTabs = Object.values(stateValue);
  }

  const existingTabIndex = currentTabs.findIndex(
    (tab) => tab.uri === _file.uri
  );

  if (existingTabIndex !== -1) {
    const updatedTabs = currentTabs.map((tab, index) => ({
      ...tab,
      active: index === existingTabIndex,
    }));

    dispatch(update_editor_tabs(updatedTabs));
  } else {
    const newTab: IEditorTab = {
      name: _file.name,
      uri: _file.uri,
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
});
