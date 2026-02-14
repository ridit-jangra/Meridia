import "./services/theme/theme.service";
import { h } from "./ui/common/h";
import { Label } from "./ui/components/label";
import { Button } from "./ui/components/button";
import { Switch } from "./ui/components/switch";
import { Select } from "./ui/components/select";
import { Tooltip } from "./ui/components/tooltip";
import { ScrollArea } from "./ui/components/scroll-area";
import { Menubar } from "./ui/components/menubar";
import { ContextMenu } from "./ui/components/context-menu";

import "@vscode/codicons/dist/codicon.css";
import "./style.css";

const root = document.getElementById("app")!;

const themeSelect = Select({
  value: "dark",
  items: [
    { value: "dark", label: "Dark" },
    { value: "light", label: "Light" },
  ],
  onChange: (v) => console.log("Theme:", v),
});

const ctx = ContextMenu();

const menubar = Menubar({
  menus: [
    {
      label: "File",
      items: [
        { type: "item", label: "New File", command_id: "Ctrl+N" },
        { type: "item", label: "Open...", command_id: "Ctrl+O" },
        { type: "separator" },
        {
          type: "item",
          label: "Open Recent",
          sub_menu: [
            { type: "item", label: "project-1" },
            { type: "item", label: "project-2" },
          ],
        },
        {
          type: "item",
          label: "Open Recen 2t",
          sub_menu: [
            { type: "item", label: "project-1" },
            { type: "item", label: "project-2" },
          ],
        },
      ],
    },
  ],
});

const autoSaveSwitch = Switch({
  checked: true,
  onChange: (v) => console.log("Auto Save:", v),
});

const saveBtn = Button("Save Settings", {
  variant: "default",
  onClick: () => console.log("Saved"),
});

const saveBtn2 = Button("Save Settings 2", {
  variant: "destructive",
  onClick: () => console.log("Saved"),
});

const longContent = Array.from({ length: 30 }, (_, i) =>
  h(
    "div",
    {
      class:
        "px-2 py-1 text-[13px] border-b border-workbench-border hover:bg-select-option-hover-background",
    },
    `Setting item ${i + 1}`,
  ),
);

const scroll = ScrollArea({
  class:
    "h-[200px] w-full border border-workbench-border rounded-[7px] bg-panel-background",
  children: longContent,
});

root.appendChild(
  h(
    "div",
    {
      class: "p-4 flex flex-col gap-4 w-[300px] bg-background text-foreground",
    },

    Label("Theme"),
    themeSelect.el,

    Label("Auto Save"),
    autoSaveSwitch.el,

    saveBtn,
    saveBtn2,

    Label("Scrollable Area"),
    scroll.el,
  ),
);

root.prepend(menubar.el);

Tooltip({
  text: "Save current settings (Ctrl+S)",
  child: saveBtn,
  position: "top",
});

Tooltip({
  text: "Delete everything permanently",
  child: saveBtn2,
  position: "top",
});

ctx.bind(root, () => [
  {
    type: "item",
    label: "New File",
    command_id: "Ctrl+N",
    onClick: () => console.log("new"),
  },
  { type: "item", label: "Rename", onClick: () => console.log("rename") },
  { type: "separator" },
  {
    type: "submenu",
    label: "Git",
    items: [
      { type: "item", label: "Commit", onClick: () => console.log("commit") },
      { type: "item", label: "Push", onClick: () => console.log("push") },
    ],
  },
  { type: "separator" },
  { type: "item", label: "Delete", disabled: true },
]);
