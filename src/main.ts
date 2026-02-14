import "./services/theme/theme.service";
import { h } from "./ui/common/h";
import { Label } from "./ui/components/label";
import { Button } from "./ui/components/button";
import { Switch } from "./ui/components/switch";
import { Select } from "./ui/components/select";

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
  ),
);

// Use contextBridge
window.ipcRenderer.on("main-process-message", (_event, message) => {
  console.log(message);
});
