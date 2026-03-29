import { ScrollArea } from "../../browser/parts/components/scroll-area";
import { Button } from "../../browser/parts/components/button";
import { codicon } from "../../browser/parts/components/icon";
import {
  ChatBubble,
  ChatLoadingBubble,
  ChatToolChip,
  ChatMessageBox,
  ChatPermissionCard,
} from "../../browser/parts/components/chat";
import { h } from "../core/dom/h";
import { cn } from "../core/utils/cn";
import {
  CHAT_SESSIONS_KEY,
  CHAT_ACTIVE_KEY,
} from "../../../../../shared/storage-keys";
import { marked } from "marked";
import hljs from "highlight.js";

marked.use({
  renderer: {
    code({ text, lang }: { text: string; lang?: string }) {
      const language = lang && hljs.getLanguage(lang) ? lang : "plaintext";
      const result = hljs.highlight(text, { language });
      return `<pre><code class="hljs language-${language}">${result.value}</code></pre>`;
    },
  },
});

interface StoredTool {
  tool: string;
  args: unknown;
  result: unknown;
}

interface StoredMessage {
  role: "user" | "assistant";
  text: string;
  tools?: StoredTool[];
}

interface StoredSession {
  id: string;
  name: string;
  session_id: string;
  messages: StoredMessage[];
}

interface Session extends StoredSession {
  message_count: number;
  is_loading: boolean;
  pill: HTMLElement;
  pane: HTMLElement;
  scroll: ReturnType<typeof ScrollArea>;
  messages_el: HTMLElement;
  empty_el: HTMLElement;
  loading_bubble: HTMLElement;
}

let session_counter = 0;

export function Chat() {
  const sessions = new Map<string, Session>();
  let active_id = "";
  let save_timer: ReturnType<typeof setTimeout> | null = null;

  function save() {
    if (save_timer) clearTimeout(save_timer);
    save_timer = setTimeout(() => {
      const stored: StoredSession[] = [...sessions.values()].map((s) => ({
        id: s.id,
        name: s.name,
        session_id: s.session_id,
        messages: s.messages,
      }));
      window.storage.set(CHAT_SESSIONS_KEY, stored);
      window.storage.set(CHAT_ACTIVE_KEY, active_id);
    }, 300);
  }

  const content_area = h("div", {
    class: "flex-1 min-h-0 relative overflow-hidden",
  });

  const chat_input = ChatMessageBox({
    onSubmit: (_val, thinking) => submit(thinking),
  });
  const input_bar = chat_input.el;

  const pill_base =
    "px-3 py-1 text-[13px] rounded-full cursor-pointer select-none flex items-center gap-1.5 transition-colors min-w-0 max-w-[160px]";
  const pill_active =
    "bg-view-tab-active-background text-view-tab-active-foreground";
  const pill_inactive =
    "bg-view-tab-background text-view-tab-foreground hover:bg-view-tab-hover-background hover:text-view-tab-hover-foreground";

  const add_btn = h(
    "div",
    { class: "flex items-center shrink-0" },
    Button(codicon("add", "text-[12px]"), {
      variant: "ghost",
      size: "icon",
      class:
        "w-6 h-6 rounded-[5px] text-view-tab-foreground hover:text-view-tab-active-foreground",
      tooltip: { text: "New chat", position: "top" },
      onClick: () => add_session(),
    }),
  );

  const tabs_row = h("div", {
    class:
      "flex items-center gap-2 p-3 shrink-0 flex-1 min-w-0 overflow-hidden",
  });
  tabs_row.appendChild(add_btn);

  const header = h("div", {
    class: "flex items-center justify-between w-full shrink-0",
  });
  header.appendChild(tabs_row);

  function activate(id: string) {
    const prev = sessions.get(active_id);
    if (prev) {
      prev.pane.style.display = "none";
      prev.pill.className = cn(pill_base, pill_inactive);
    }
    active_id = id;
    const s = sessions.get(id)!;
    s.pane.style.display = "flex";
    s.pill.className = cn(pill_base, pill_active);
    chat_input.setDisabled(s.is_loading);
    requestAnimationFrame(() => chat_input.focus());
    save();
  }

  function build_pane(stored: StoredSession) {
    const empty_el = h(
      "div",
      {
        class:
          "flex-1 flex flex-col items-center justify-center gap-1.5 px-8 pb-8 text-center select-none pointer-events-none",
      },
      h(
        "span",
        { class: "text-[13px] font-semibold text-chat-foreground/50" },
        "How can I help?",
      ),
      h(
        "span",
        {
          class:
            "text-[11px] text-chat-foreground/25 leading-relaxed max-w-[180px]",
        },
        "Ask anything about your code or workspace.",
      ),
    );

    const messages_el = h("div", {
      class: "flex flex-col gap-3 px-3 pt-3 pb-2",
      style: "display:none",
    });

    if (stored.messages.length > 0) {
      empty_el.style.display = "none";
      messages_el.style.display = "flex";
      for (const m of stored.messages) {
        render_message(messages_el, m);
      }
    }

    const scroll = ScrollArea({
      class: "flex-1 min-h-0",
      innerClass: "flex flex-col min-h-full",
    });
    scroll.inner.appendChild(empty_el);
    scroll.inner.appendChild(messages_el);

    requestAnimationFrame(
      () => (scroll.viewport.scrollTop = scroll.viewport.scrollHeight),
    );

    const pane = h(
      "div",
      { class: "absolute inset-0 flex flex-col", style: "display:none" },
      scroll.el,
    );
    content_area.appendChild(pane);

    return { pane, scroll, messages_el, empty_el };
  }

  function render_message(container: HTMLElement, m: StoredMessage) {
    const bubble = ChatBubble({ role: m.role, text: m.text });

    if (m.tools?.length) {
      const tools_row = h("div", { class: "flex flex-col gap-1 mb-2" });
      for (const t of m.tools) {
        tools_row.appendChild(ChatToolChip(t).el);
      }
      bubble.insertBefore(tools_row, bubble.firstChild);
    }

    container.appendChild(bubble);
  }

  function add_session(stored?: StoredSession) {
    session_counter++;
    const id = stored?.id ?? crypto.randomUUID();
    const name = stored?.name ?? `Chat ${session_counter}`;
    const session_id = stored?.session_id ?? crypto.randomUUID();
    const messages: StoredMessage[] = stored?.messages ?? [];

    const { pane, scroll, messages_el, empty_el } = build_pane({
      id,
      name,
      session_id,
      messages,
    });

    const close_x = h("span", {
      class:
        "shrink-0 flex items-center justify-center w-3.5 h-3.5 rounded opacity-60 hover:opacity-100 transition-opacity",
      on: {
        click: (e: MouseEvent) => {
          e.stopPropagation();
          remove_session(id);
        },
      },
    });
    close_x.appendChild(codicon("close", "text-[10px]"));

    const pill = h(
      "div",
      {
        class: cn(pill_base, pill_inactive),
        on: { click: () => activate(id) },
      },
      h("span", { class: "flex-1 min-w-0 truncate" }, name),
      close_x,
    );

    tabs_row.insertBefore(pill, add_btn);

    const session: Session = {
      id,
      name,
      session_id,
      messages,
      message_count: messages.length,
      is_loading: false,
      pill,
      pane,
      scroll,
      messages_el,
      empty_el,
      loading_bubble: ChatLoadingBubble(),
    };
    sessions.set(id, session);
    return session;
  }

  function remove_session(id: string) {
    const s = sessions.get(id);
    if (!s) return;

    const ids = [...sessions.keys()];
    const idx = ids.indexOf(id);

    s.pill.remove();
    s.pane.remove();
    sessions.delete(id);

    if (sessions.size === 0) {
      const fresh = add_session();
      activate(fresh.id);
    } else if (active_id === id) {
      activate(ids[idx - 1] ?? ids[idx + 1]);
    }

    save();
  }

  function append_message(
    s: Session,
    role: "user" | "assistant",
    text: string,
    tools?: StoredTool[],
  ) {
    if (s.message_count === 0) {
      s.empty_el.style.display = "none";
      s.messages_el.style.display = "flex";
    }
    s.message_count++;

    const m: StoredMessage = {
      role,
      text,
      ...(tools?.length ? { tools } : {}),
    };
    s.messages.push(m);
    render_message(s.messages_el, m);

    requestAnimationFrame(
      () => (s.scroll.viewport.scrollTop = s.scroll.viewport.scrollHeight),
    );

    save();
  }

  function set_loading(s: Session, val: boolean) {
    s.is_loading = val;
    if (s.id === active_id) {
      chat_input.setDisabled(val);
    }
    if (val) {
      s.messages_el.appendChild(s.loading_bubble);
      requestAnimationFrame(
        () => (s.scroll.viewport.scrollTop = s.scroll.viewport.scrollHeight),
      );
    } else {
      s.loading_bubble.remove();
    }
  }

  async function submit(thinking = false) {
    const s = sessions.get(active_id);
    if (!s || s.is_loading) return;
    const val = chat_input.value.trim();
    if (!val) return;

    chat_input.clear();
    append_message(s, "user", val);
    set_loading(s, true);

    try {
      const cwd = (await window.workspace?.get_current_workspace_path()) ?? "";
      const result = await window.chat.push(s.session_id, val, {
        cwd,
        files: [],
        thinking,
      });
      if (result.error) {
        append_message(s, "assistant", result.error);
      } else {
        append_message(s, "assistant", result.message, result.tools);
        if (result.model) {
          chat_input.setModel(result.model);
        }
        if (result.permissionRequired?.length) {
          for (const p of result.permissionRequired) {
            const card = ChatPermissionCard({
              tool: p.tool,
              description: p.description,
              onAllow: () => console.log("allow", p.tool),
              onDeny: () => console.log("deny", p.tool),
            });
            s.messages_el.appendChild(card.el);
          }
          requestAnimationFrame(
            () =>
              (s.scroll.viewport.scrollTop = s.scroll.viewport.scrollHeight),
          );
        }
      }
    } catch (e) {
      append_message(
        s,
        "assistant",
        e instanceof Error ? e.message : "Something went wrong.",
      );
    } finally {
      set_loading(s, false);
      if (s.id === active_id) chat_input.focus();
    }
  }

  const el = h(
    "div",
    {
      class:
        "chat h-full w-full flex flex-col bg-chat-background text-chat-foreground overflow-hidden",
    },
    header,
    content_area,
    input_bar,
  );

  (async () => {
    const [stored_sessions, stored_active] = await Promise.all([
      window.storage.get<StoredSession[]>(CHAT_SESSIONS_KEY, []),
      window.storage.get<string>(CHAT_ACTIVE_KEY, ""),
    ]);

    if (stored_sessions?.length) {
      session_counter = stored_sessions.length;
      for (const s of stored_sessions) {
        add_session(s);
      }
      const target =
        stored_active && sessions.has(stored_active)
          ? stored_active
          : [...sessions.keys()][0];
      activate(target);
    } else {
      const fresh = add_session();
      activate(fresh.id);
    }
  })();

  return el;
}
