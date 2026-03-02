import { CommandList } from "../components/command-list";
import {
  get_monaco_encodings,
  get_monaco_indentations,
  get_monaco_languages,
} from "../../../../editor/editor.helper";
import { statusbar_events } from "../../../../platform/events/statusbar.events";
import { explorer } from "../../../../platform/explorer/explorer.service";
import { store } from "../../../common/state/store";
import { h } from "../../../contrib/core/dom/h";
import { cn } from "../../../contrib/core/utils/cn";
import { Breadcrumb } from "../components/breadcrumb";
import { Tooltip } from "../components/tooltip";
import { editor_events } from "../../../../platform/events/editor.events";

function StatusbarItem(text?: string) {
  const el = h(
    "div",
    {
      class:
        "px-2.5 h-full items-center cursor-pointer rounded-[7px] hover:bg-statusbar-item-hover-background select-none whitespace-nowrap transition-colors",
      style: "display: none;",
    },
    text ?? "",
  );

  return {
    el,
    setText(t: string | null) {
      if (t === null || t === undefined) {
        el.style.display = "none";
      } else {
        el.style.display = "flex";
        el.textContent = t;
      }
    },
  };
}

export function Statusbar() {
  const left = h("div", { class: "flex items-center min-w-0" });

  const lineColItem = StatusbarItem();
  const indentItem = StatusbarItem();
  const encodingItem = StatusbarItem();
  const languageItem = StatusbarItem();

  let lastBreadcrumbPath: string | null = null;
  let breadcrumb: ReturnType<typeof Breadcrumb> | null = null;

  store.subscribe(async () => {
    const { tabs } = store.getState().editor;

    const active = tabs.find((t) => t.active);
    if (!active) {
      const tree = explorer.tree.structure;
      if (!tree) return;

      left.textContent = tree.root.name;

      lastBreadcrumbPath = null;
      breadcrumb = null;

      lineColItem.setText(null);
      indentItem.setText(null);
      encodingItem.setText(null);
      languageItem.setText(null);

      return;
    }

    const tree = explorer.tree.structure;
    if (!tree) {
      left.textContent = active.name;
      lastBreadcrumbPath = null;
      breadcrumb = null;
    } else {
      const relative = await window.files.relative(tree.path, active.file_path);

      // ✅ Only update breadcrumb if path changed
      if (relative !== lastBreadcrumbPath) {
        lastBreadcrumbPath = relative;

        left.innerHTML = "";
        breadcrumb = Breadcrumb({ path: relative });
        left.appendChild(breadcrumb.el);
      }
    }
  });

  let has_active = false;

  store.subscribe(() => {
    has_active = !!store.getState().editor.tabs.find((t) => t.active);
  });

  statusbar_events.on(
    "updateLineCol",
    (line: number | null, col: number | null) => {
      if (!has_active) return;
      lineColItem.setText(
        line !== null && col !== null ? `Ln ${line}, Col ${col}` : null,
      );
    },
  );

  statusbar_events.on("updateIndentation", (space: number | null) => {
    if (!has_active) return;
    indentItem.setText(space !== null ? `Spaces: ${space}` : null);
  });

  statusbar_events.on("updateEncoding", (encoding: string | null) => {
    if (!has_active) return;
    encodingItem.setText(encoding);
  });

  statusbar_events.on("updateLanguage", (language: string | null) => {
    if (!has_active) return;
    languageItem.setText(language);
  });

  const languagePicker = CommandList({
    items: get_monaco_languages().map((l) => ({
      id: l.id,
      label: l.label,
      // description: l.id,
    })),
    onSelect(item) {
      editor_events.emit("setLanguage", item.id);
      // setEditorLanguage(item.id);
    },
    placeholder: "Select Language…",
  });

  const encodingPicker = CommandList({
    items: get_monaco_encodings(),
    onSelect(item) {
      // setEditorEncoding(item.id);
    },
    placeholder: "Select Encoding…",
  });

  const indentPicker = CommandList({
    items: get_monaco_indentations(),
    onSelect(item) {
      // setEditorIndentation(Number(item.id));
    },
    placeholder: "Select Indentation…",
  });

  Tooltip({
    child: lineColItem.el,
    text: "Go to Line/Column",
    position: "top",
    delay: 300,
  });
  Tooltip({
    child: indentItem.el,
    text: "Select Indentation",
    position: "top",
    delay: 300,
  });
  Tooltip({
    child: encodingItem.el,
    text: "Select Encoding",
    position: "top",
    delay: 300,
  });
  Tooltip({
    child: languageItem.el,
    text: "Select Language Mode",
    position: "top",
    delay: 300,
  });

  indentItem.el.onclick = () => {
    indentPicker.open();
  };

  encodingItem.el.onclick = () => {
    encodingPicker.open();
  };

  languageItem.el.onclick = () => {
    languagePicker.open();
  };

  const right = h(
    "div",
    {
      class: "flex items-center justify-center gap-0.5 min-w-0",
    },
    lineColItem.el,
    indentItem.el,
    encodingItem.el,
    languageItem.el,
  );

  const el = h(
    "div",
    {
      class: cn(
        "h-[28px] text-[13px] text-statusbar-foreground w-full flex items-center justify-between px-2",
        "bg-statusbar-background",
      ),
    },
    left,
    right,
  );

  return el;
}
