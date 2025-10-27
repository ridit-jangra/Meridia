import hljs from "highlight.js";
import { marked } from "marked";
import { IChatMessage } from "../types.js";
import { geminiIcon, getThemeIcon } from "./media/icons.js";
import { CoreEl } from "./parts/el.js";
import { Chat } from "../common/mira/chat.js";

export class Mira extends CoreEl {
  private _input!: HTMLInputElement;
  private _content!: HTMLDivElement;
  private _chatHistory: IChatMessage[] = [];
  private _chat: Chat;

  constructor() {
    super();
    this._chat = new Chat();
    this._initializeRenderer();
    this._createEl();
    this._setupEventListeners();
  }

  private _initializeRenderer() {
    const escapeHtml = (text: string): string => {
      if (!text || typeof text !== "string") return "";

      const map: { [key: string]: string } = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return text.replace(/[&<>"']/g, (char) => map[char] || char);
    };

    marked.use({
      renderer: {
        code: (token: any) => {
          const code = token.text || "";
          const language = token.lang || "";

          try {
            let highlightedCode;
            if (language && hljs.getLanguage(language)) {
              highlightedCode = hljs.highlight(code, { language }).value;
            } else {
              const result = hljs.highlightAuto(code);
              highlightedCode = result.value;
            }

            return `<pre><code class="hljs language-${language}">${highlightedCode}</code></pre>`;
          } catch (error) {
            return `<pre><code class="hljs">${escapeHtml(code)}</code></pre>`;
          }
        },

        codespan: (token: any) => {
          const code = token.text || "";
          return `<code class="hljs-inline">${escapeHtml(code)}</code>`;
        },
      },
      gfm: true,
      breaks: true,
    });
  }

  private _addMessage(message: IChatMessage) {
    if (!this._content.classList.contains("chat"))
      this._content.classList.add("chat");

    const contentChildren = Array.from(this._content.childNodes);
    contentChildren.forEach((node) => {
      if (
        !(node as any).classList?.contains("message") &&
        !(node as any).classList?.contains("ps__rail-x") &&
        !(node as any).classList?.contains("ps__rail-y")
      ) {
        node.remove();
      }
    });

    const messageEl = document.createElement("div");
    messageEl.className = `message ${message.isUser ? "user" : "ai"}`;
    messageEl.dataset.messageId = message.id;

    const contentEl = document.createElement("div");
    contentEl.className = "message-content";

    if (!message.isUser) {
      const iconEl = document.createElement("span");
      iconEl.className = "message-icon";
      iconEl.innerHTML = geminiIcon;
      contentEl.appendChild(iconEl);
    }

    const textEl = document.createElement("div");
    textEl.className = "message-text";

    if (!message.isUser && message.content) {
      try {
        textEl.innerHTML = marked.parse(message.content) as string;
      } catch (error) {
        textEl.textContent = message.content;
      }
    } else {
      textEl.textContent = message.content || "";
    }

    contentEl.appendChild(textEl);
    messageEl.appendChild(contentEl);
    this._content.appendChild(messageEl);
    this._scrollToBottom();
  }

  private _createEl() {
    this._el = document.createElement("div");
    this._el.className = "mira";

    this._content = document.createElement("div");
    this._content.className = "content scrollbar-container x-disable";

    const _icon = document.createElement("span");
    _icon.innerHTML = geminiIcon;

    const _title = document.createElement("p");
    _title.className = "title";
    _title.textContent = "Mira powered by Gemini";

    this._content.appendChild(_icon);
    this._content.appendChild(_title);

    const _chatbox = document.createElement("div");
    _chatbox.className = "chatbox";

    this._input = document.createElement("input");
    this._input.type = "text";
    this._input.placeholder = "Ask Mira anything...";

    const _send = document.createElement("span");
    _send.className = "send";
    _send.innerHTML = getThemeIcon("send");

    const _attach = document.createElement("span");
    _attach.className = "attach";
    _attach.innerHTML = getThemeIcon("attach");

    _chatbox.appendChild(this._input);
    _chatbox.appendChild(_attach);
    _chatbox.appendChild(_send);

    this._el.appendChild(this._content);
    this._el.appendChild(_chatbox);
  }

  private _setupEventListeners() {
    const sendButton = this._el!.querySelector(".send") as HTMLElement;

    sendButton.addEventListener("click", () => this._handleSendMessage());

    this._input.addEventListener("keypress", (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        this._handleSendMessage();
      }
    });
  }

  private async _handleSendMessage() {
    const message = this._input.value.trim();
    if (!message) return;

    const _message: IChatMessage = {
      id: crypto.randomUUID(),
      content: message,
      isUser: true,
    };

    this._addMessage(_message);
    this._chatHistory.push(_message);
    this._input.value = "";

    this._showTypingIndicator();

    const aiResponse = await this._generateResponse(message);
    const aiMessage: IChatMessage = {
      id: crypto.randomUUID(),
      content: aiResponse,
      isUser: false,
    };

    this._addMessage(aiMessage);
    this._chatHistory.push(aiMessage);

    this._hideTypingIndicator();
  }

  private async _generateResponse(_message: string) {
    const message = _message.toLowerCase();
    const _response = await this._chat.chat(message, this._chatHistory);
    return _response!;
  }

  private _showTypingIndicator() {
    const typingEl = document.createElement("div");
    typingEl.className = "message ai typing-indicator";
    typingEl.innerHTML = `
      <div class="message-content">
        <div class="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `;

    this._content.appendChild(typingEl);
    this._scrollToBottom();
  }

  private _hideTypingIndicator() {
    const typingIndicator = this._content.querySelector(".typing-indicator");
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }

  private _scrollToBottom() {
    this._content.scrollTop = this._content.scrollHeight;
  }
}
