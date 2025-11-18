import monaco from "./utils.js";
import { marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import { baseUrl } from "marked-base-url";
import { IPreviewTab } from "../../workbench/workbench.types.js";
import { select } from "../../workbench/common/store/selector.js";
import { dispatch } from "../../workbench/common/store/store.js";
import { update_preview_tabs } from "../../workbench/common/store/slice.js";
import { registerStandalone } from "../../workbench/common/class.js";
import { getFileIcon } from "../../workbench/common/utils.js";
import { getThemeIcon } from "../../workbench/browser/media/icons.js";
import { _xtermManager } from "../../workbench/common/devPanel/spawnXterm.js";

const path = window.path;
const fs = window.fs;

export class Preview {
  private _layout!: HTMLDivElement;
  private _contentContainer!: HTMLDivElement;
  private _mounted = false;
  private _currentModel: monaco.editor.ITextModel | null = null;
  private _currentEditor: monaco.editor.IStandaloneCodeEditor | null = null;
  private _contentChangeListener: monaco.IDisposable | null = null;
  private _scrollListener: monaco.IDisposable | null = null;
  private _previewScrollListener: (() => void) | null = null;
  private _isUpdatingState = false;
  private _resizeObserver: ResizeObserver | null = null;
  private _isSyncingScroll = false;

  constructor() {
    marked.use(
      markedHighlight({
        langPrefix: "hljs language-",
        highlight(code: string, lang: string) {
          const language = hljs.getLanguage(lang) ? lang : "plaintext";
          return hljs.highlight(code, { language }).value;
        },
      })
    );
  }

  _mount() {
    if (this._mounted) return;
    this._layout = document.querySelector(".preview-area") as HTMLDivElement;

    this._contentContainer = document.createElement("div");
    this._contentContainer.className =
      "preview-content scrollbar-container x-disable";

    const bottomPanel = document.querySelector(
      ".bottom-panel"
    ) as HTMLDivElement;

    this._resizeObserver = new ResizeObserver(() => {
      const calculatedHeight =
        this._layout.parentElement!.parentElement!.parentElement!.parentElement!
          .offsetHeight + "px";
      this._layout.parentElement!.parentElement!.style.height =
        calculatedHeight;
    });

    this._resizeObserver.observe(bottomPanel);

    this._layout.appendChild(this._contentContainer);

    this._mounted = true;
  }

  private _sync(
    editor: monaco.editor.IStandaloneCodeEditor,
    model: monaco.editor.ITextModel
  ) {
    if (this._scrollListener) {
      this._scrollListener.dispose();
    }

    if (this._previewScrollListener) {
      this._contentContainer.removeEventListener(
        "scroll",
        this._previewScrollListener
      );
    }

    if (!editor) {
      console.warn("No editor found for model");
      return;
    }

    this._scrollListener = editor.onDidScrollChange((e) => {
      const editorModel = editor.getModel();
      if (!editorModel || editorModel.uri.toString() !== model.uri.toString()) {
        return;
      }

      if (e.scrollTopChanged && !this._isSyncingScroll) {
        this._isSyncingScroll = true;

        const editorScrollHeight = editor.getScrollHeight();
        const editorVisibleHeight = editor.getLayoutInfo().height;
        const maxScroll = editorScrollHeight - editorVisibleHeight;

        if (maxScroll <= 0) {
          this._isSyncingScroll = false;
          return;
        }

        const scrollPercentage = e.scrollTop / maxScroll;

        const previewScrollHeight = this._contentContainer.scrollHeight;
        const previewVisibleHeight = this._contentContainer.clientHeight;
        const previewMaxScroll = previewScrollHeight - previewVisibleHeight;

        if (previewMaxScroll <= 0) {
          this._isSyncingScroll = false;
          return;
        }

        const previewScrollTop = scrollPercentage * previewMaxScroll;
        this._contentContainer.scrollTop = previewScrollTop;

        setTimeout(() => {
          this._isSyncingScroll = false;
        }, 0);
      }
    });

    this._previewScrollListener = () => {
      if (this._isSyncingScroll) return;

      if (!this._currentEditor) return;

      const editorModel = this._currentEditor.getModel();
      if (
        !editorModel ||
        !this._currentModel ||
        editorModel.uri.toString() !== this._currentModel.uri.toString()
      ) {
        return;
      }

      this._isSyncingScroll = true;

      const previewScrollTop = this._contentContainer.scrollTop;
      const previewScrollHeight = this._contentContainer.scrollHeight;
      const previewVisibleHeight = this._contentContainer.clientHeight;
      const previewMaxScroll = previewScrollHeight - previewVisibleHeight;

      if (previewMaxScroll <= 0) {
        this._isSyncingScroll = false;
        return;
      }

      const scrollPercentage = previewScrollTop / previewMaxScroll;

      const editorScrollHeight = this._currentEditor.getScrollHeight();
      const editorVisibleHeight = this._currentEditor.getLayoutInfo().height;
      const editorMaxScroll = editorScrollHeight - editorVisibleHeight;

      if (editorMaxScroll <= 0) {
        this._isSyncingScroll = false;
        return;
      }

      const editorScrollTop = scrollPercentage * editorMaxScroll;
      this._currentEditor.setScrollTop(editorScrollTop);

      setTimeout(() => {
        this._isSyncingScroll = false;
      }, 0);
    };

    this._contentContainer.addEventListener(
      "scroll",
      this._previewScrollListener
    );
  }

  private _setupCopyButtons() {
    this._contentContainer.querySelectorAll("pre").forEach((pre) => {
      const codeElement = pre.querySelector("code");
      if (!codeElement) return;

      const languageClass = Array.from(codeElement.classList).find((cls) =>
        cls.startsWith("language-")
      );
      const language = languageClass?.replace("language-", "") || "";

      const shellLanguages = [
        "bash",
        "sh",
        "shell",
        "zsh",
        "powershell",
        "ps1",
        "cmd",
        "batch",
        "terminal",
      ];
      const _shell = shellLanguages.includes(language.toLowerCase());

      const buttonContainer = document.createElement("div");
      buttonContainer.className = "code-actions";
      buttonContainer.style.cssText =
        "position: absolute; top: 8px; right: 8px; display: flex; gap: 8px;";

      const copyBtn = document.createElement("div");
      copyBtn.className = "copy";
      copyBtn.textContent = "Copy";

      copyBtn.addEventListener("click", async () => {
        const code = codeElement.textContent || "";

        try {
          await navigator.clipboard.writeText(code);

          copyBtn.textContent = "Copied!";
          copyBtn.classList.add("copied");

          setTimeout(() => {
            copyBtn.textContent = "Copy";
            copyBtn.classList.remove("copied");
          }, 2000);
        } catch (err) {
          console.error("Failed to copy:", err);
          copyBtn.textContent = "Failed";

          setTimeout(() => {
            copyBtn.textContent = "Copy";
          }, 2000);
        }
      });

      buttonContainer.appendChild(copyBtn);

      if (_shell) {
        const runBtn = document.createElement("div");
        runBtn.className = "run";
        runBtn.innerHTML = `<span>${getThemeIcon("run")}</span><span>Run</span>`;

        runBtn.addEventListener("click", () => {
          const code = codeElement.textContent || "";
          this._execute(code);
        });

        buttonContainer.appendChild(runBtn);
      }

      pre.style.position = "relative";
      pre.appendChild(buttonContainer);
    });
  }

  private _execute(command: string) {
    _xtermManager._runCommand(command);
  }

  async _preview(model: monaco.editor.ITextModel, uri: string) {
    let content = "";
    if (model) content = model.getValue();
    else content = fs.readFile(uri);

    console.log("content", content);

    const currentFileDir = path.dirname(uri);
    marked.use(baseUrl(`file:///${currentFileDir}/`));

    const html = await marked.parse(content);

    this._contentContainer.innerHTML = html;

    this._setupCopyButtons();

    this._contentContainer.querySelectorAll("code").forEach((v) => {
      v.classList.add("scrollbar-container", "y-disable");
    });
  }

  _close(tab: IPreviewTab) {
    if (this._currentModel) {
      const currentModelUri = this._currentModel.uri.toString();
      const tabUri = monaco.Uri.parse(tab.uri).toString();

      if (currentModelUri === tabUri) {
        if (this._contentChangeListener) {
          this._contentChangeListener.dispose();
          this._contentChangeListener = null;
        }

        if (this._scrollListener) {
          this._scrollListener.dispose();
          this._scrollListener = null;
        }

        if (this._previewScrollListener) {
          this._contentContainer.removeEventListener(
            "scroll",
            this._previewScrollListener
          );
          this._previewScrollListener = null;
        }

        this._currentModel = null;
        this._currentEditor = null;
        this._contentContainer.innerHTML = "";
      }
    }
  }

  async _open(tab: IPreviewTab, editor: monaco.editor.IStandaloneCodeEditor) {
    if (!this._mounted) this._mount();

    const model = monaco.editor.getModel(monaco.Uri.parse(tab.uri));

    if (this._contentChangeListener) {
      this._contentChangeListener.dispose();
      this._contentChangeListener = null;
    }

    if (this._scrollListener) {
      this._scrollListener.dispose();
      this._scrollListener = null;
    }

    if (this._previewScrollListener) {
      this._contentContainer.removeEventListener(
        "scroll",
        this._previewScrollListener
      );
      this._previewScrollListener = null;
    }

    this._currentModel = model;
    this._currentEditor = editor;

    await this._preview(model!, tab.uri);

    this._contentChangeListener = model!.onDidChangeContent(async () => {
      if (this._currentModel === model) {
        await this._preview(model!, tab.uri);
      }
    });

    this._sync(editor, model!);

    if (this._isUpdatingState) return;

    const currentTabs = select((s) => s.main.preview_tabs);
    const tabsArray = Array.isArray(currentTabs) ? currentTabs : [];

    const existingTabIndex = tabsArray.findIndex((t) => t.uri === tab.uri);

    let needsUpdate = false;
    let updatedTabs: IPreviewTab[] = [];

    if (existingTabIndex !== -1) {
      if (tabsArray[existingTabIndex]!.active) {
        return;
      } else {
        needsUpdate = true;
        updatedTabs = tabsArray.map((t, index) => ({
          ...t,
          active: index === existingTabIndex,
        }));
      }
    } else {
      needsUpdate = true;
      const newTab: IPreviewTab = {
        name: tab.name,
        uri: tab.uri,
        active: true,
        icon: tab.icon || getFileIcon("file.md"),
      };

      updatedTabs = [
        ...tabsArray.map((t) => ({ ...t, active: false })),
        newTab,
      ];
    }

    if (needsUpdate) {
      this._isUpdatingState = true;
      dispatch(update_preview_tabs(updatedTabs));

      setTimeout(() => {
        this._isUpdatingState = false;
      }, 0);
    }
  }
}

export const _preview = new Preview();
registerStandalone("preview", _preview);
