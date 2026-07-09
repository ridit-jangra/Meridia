import { ScrollArea } from "../../browser/parts/components/scroll-area";
import { Button } from "../../browser/parts/components/button";
import { codicon } from "../../browser/parts/components/icon";
import {
  ChatBubble,
  ChatLoadingBubble,
  ChatMessageBox,
  ChatPermissionCard,
} from "../../browser/parts/components/chat";
import type { PermissionRequestPayload } from "../../../../../shared/types/chat.types";
import {
  open_ai_diff,
  clear_ai_diff,
  close_ai_diff,
} from "../editor/group/special";
import { h } from "../core/dom/h";
import { cn } from "../core/utils/cn";
import {
  CHAT_SESSIONS_KEY,
  CHAT_ACTIVE_KEY,
} from "../../../../../shared/storage-keys";
import { marked } from "marked";
import hljs from "highlight.js";
import {
  type Tool,
  ChatToolChip,
} from "../../browser/parts/components/chat/chat-tool-chip";
import { Permission } from "../../../../../shared/types/chat.types";

let listenersInitialized = false;

marked.use({
  renderer: {
    code({ text, lang }: { text: string; lang?: string }) {
      const language = lang && hljs.getLanguage(lang) ? lang : "plaintext";
      const result = hljs.highlight(text, { language });
      return `<pre><code class="hljs language-${language}">${result.value}</code></pre>`;
    },
  },
});

interface StoredMessage {
  role: "user" | "assistant";
  text: string;
  tools?: Tool[];
  is_error?: boolean;
  permission?: { tool: string; description: string }[];
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

  turn_tools: Map<string, Tool>;
  turn_els: Map<string, HTMLElement>;
}

let session_counter = 0;

export function Chat() {
  const sessions = new Map<string, Session>();
  let active_id = "";
  let save_timer: ReturnType<typeof setTimeout> | null = null;
  const agent_handles = new Map<string, ReturnType<typeof make_agent_card>>();

  function finalize_turn(s: Session): Tool[] {
    const tools = [...s.turn_tools.values()];
    for (const el of s.turn_els.values()) el.remove();
    s.turn_els.clear();
    s.turn_tools.clear();
    return tools;
  }

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
    const bubble = ChatBubble({
      role: m.role,
      text: m.text,
      is_error: m.is_error,
    });

    if (m.tools?.length) {
      const tools_row = h("div", { class: "flex flex-col gap-1 my-1" });
      for (const t of m.tools) {
        tools_row.appendChild(ChatToolChip(t).el);
      }

      bubble.insertBefore(tools_row, bubble.lastChild);
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
      turn_tools: new Map(),
      turn_els: new Map(),
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
    tools?: Tool[],
    is_error?: boolean,
    permission?: Permission[],
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
      ...(is_error ? { is_error: true } : {}),
      permission,
    };
    s.messages.push(m);
    render_message(s.messages_el, m);

    requestAnimationFrame(
      () => (s.scroll.viewport.scrollTop = s.scroll.viewport.scrollHeight),
    );

    save();
  }

  function make_agent_card(title: string) {
    const spinner = codicon(
      "loading",
      "text-[10px] animate-spin opacity-60 shrink-0",
    );
    const check = codicon("pass", "text-[10px] text-green-400/70 shrink-0");
    check.style.display = "none";

    const head = h(
      "div",
      {
        class: "flex items-center gap-1.5 text-[11px] text-chat-foreground/70",
      },
      codicon("robot", "text-[10px] opacity-60 shrink-0"),
      h("span", { class: "font-medium truncate" }, `Agent · ${title}`),
      spinner,
      check,
    );

    const steps = h("div", {
      class: "flex flex-col gap-0.5 mt-1 pl-[18px]",
    });

    const el = h(
      "div",
      {
        class:
          "rounded-[6px] border border-chat-border px-2 py-1.5 my-1 min-w-0",
      },
      head,
      steps,
    );

    return {
      el,
      addStep(tool: string, preview: string) {
        const row = h(
          "div",
          {
            class:
              "flex items-center gap-1.5 text-[10px] text-chat-foreground/40 font-mono truncate",
          },
          codicon("chevron-right", "text-[8px] opacity-40 shrink-0"),
          h(
            "span",
            { class: "truncate" },
            preview ? `${tool} ${preview}` : tool,
          ),
        );
        steps.appendChild(row);
      },
      finish() {
        spinner.style.display = "none";
        check.style.display = "";
      },
      error(msg: string) {
        spinner.style.display = "none";
        head.appendChild(
          h("span", { class: "text-[10px] text-red-400/70" }, msg),
        );
      },
    };
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
        allowEdits: chat_input.allowEdits,
      });
      if (result.error) {
        append_message(s, "assistant", result.error, finalize_turn(s), true);
      } else {
        append_message(
          s,
          "assistant",
          result.message,
          finalize_turn(s),
          !!result.error,
          result.permissionRequired,
        );
        if (result.model) {
          chat_input.setModel(result.model);
        }
        if (result.permissionRequired?.length) {
          for (const p of result.permissionRequired) {
            const matching_tool = result.tools?.find((t) => t.tool === p.tool);
            if (!matching_tool) continue;

            const card = ChatPermissionCard({
              tool: p.tool,
              description: p.description,
              onAllow: async () => {
                await window.chat.resolvePermission(
                  s.session_id!,
                  p.id!,
                  "allow",
                );
              },
              onAllowSession: async () => {
                await window.chat.resolvePermission(
                  s.session_id!,
                  p.id!,
                  "allow_session",
                );
              },
              onDeny: async () => {
                await window.chat.resolvePermission(
                  s.session_id!,
                  p.id!,
                  "deny",
                );
              },
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
        finalize_turn(s),
        true,
      );
    } finally {
      set_loading(s, false);
      if (s.id === active_id) chat_input.focus();
    }
  }

  if (!listenersInitialized) {
    window.chat.onPermissionRequest((p: PermissionRequestPayload) => {
      const s = sessions.get(active_id);
      if (!s) return;
      if (s.message_count === 0) {
        s.empty_el.style.display = "none";
        s.messages_el.style.display = "flex";
      }

      const resolve = (decision: "allow" | "deny" | "allow_session") =>
        window.chat.resolvePermission(p.session_id, p.id, decision);

      let node: HTMLElement;

      if (p.kind === "edit" && p.diff) {
        const diff_path = p.diff.path;
        const file_name = diff_path.split(/[\\/]/).pop() ?? diff_path;

        // The decision can come from the chat card OR the editor diff bar, so
        // settle both: replace the card with a compact resolved line.
        let settled = false;
        let card_el: HTMLElement | undefined;
        const settle = (label: string) => {
          if (settled) return;
          settled = true;
          card_el?.replaceWith(
            h(
              "div",
              {
                class:
                  "text-[11px] text-chat-foreground/40 my-1 px-1 select-none",
              },
              `${label} · ${file_name}`,
            ),
          );
        };

        const accept = () => {
          if (settled) return;
          settle("Accepted");
          resolve("allow");
          clear_ai_diff(diff_path);
        };
        const reject = () => {
          if (settled) return;
          settle("Rejected");
          resolve("deny");
          close_ai_diff(diff_path);
        };
        const session = () => {
          if (settled) return;
          settle("Allowed for session");
          resolve("allow_session");
          clear_ai_diff(diff_path);
        };

        // The diff itself lives in the editor area (with its own Accept/Reject
        // bar); the chat only shows a compact confirmation card.
        open_ai_diff(diff_path, p.diff.prevContent, p.diff.newContent, {
          onAccept: accept,
          onReject: reject,
        });

        const card = ChatPermissionCard({
          tool: `${p.title || "Edit"} · ${file_name}`,
          description: "Review the diff in the editor.",
          onAllow: accept,
          onAllowSession: session,
          onDeny: reject,
        });
        card_el = card.el;
        node = card_el;
      } else {
        node = ChatPermissionCard({
          tool: p.title || p.tool,
          description: p.description,
          onAllow: () => resolve("allow"),
          onAllowSession: () => resolve("allow_session"),
          onDeny: () => resolve("deny"),
        }).el;
      }

      s.messages_el.insertBefore(node, s.loading_bubble);
      requestAnimationFrame(
        () => (s.scroll.viewport.scrollTop = s.scroll.viewport.scrollHeight),
      );
    });

    window.chat.onToolCall(({ id, tool, args }) => {
      const s = sessions.get(active_id);
      if (!s) return;
      if (s.message_count === 0) {
        s.empty_el.style.display = "none";
        s.messages_el.style.display = "flex";
      }

      s.turn_tools.set(id, {
        tool,
        input: (args as Record<string, any>) ?? {},
        output: null,
      });

      if (tool === "AgentTool") return;

      const chip = ChatToolChip({
        tool,
        input: args as Record<string, any>,
        output: null,
      });
      s.turn_els.set(id, chip.el);
      s.messages_el.insertBefore(chip.el, s.loading_bubble);
      requestAnimationFrame(
        () => (s.scroll.viewport.scrollTop = s.scroll.viewport.scrollHeight),
      );
    });

    window.chat.onToolResult(({ id, tool, result }) => {
      const s = sessions.get(active_id);
      if (!s) return;

      const rec = s.turn_tools.get(id);
      if (rec) rec.output = (result as Tool["output"]) ?? null;

      if (tool === "AgentTool") return;

      const chip = ChatToolChip({
        tool,
        input: rec?.input ?? {},
        output: (result as Tool["output"]) ?? null,
      });
      const old = s.turn_els.get(id);
      if (old) old.replaceWith(chip.el);
      else s.messages_el.insertBefore(chip.el, s.loading_bubble);
      s.turn_els.set(id, chip.el);
    });

    window.chat.onAgentEvent((e) => {
      const s = sessions.get(active_id);
      if (!s) return;

      if (e.type === "start") {
        const card = make_agent_card(e.title ?? "task");
        agent_handles.set(e.id, card);
        s.turn_els.set(`agent:${e.id}`, card.el);
        s.messages_el.insertBefore(card.el, s.loading_bubble);
      } else {
        const card = agent_handles.get(e.id);
        if (!card) return;
        if (e.type === "step" && e.step)
          card.addStep(e.step.tool, e.step.preview);
        else if (e.type === "done") {
          card.finish();
          agent_handles.delete(e.id);
        } else if (e.type === "error") {
          card.error(e.error ?? "failed");
          agent_handles.delete(e.id);
        }
      }
      requestAnimationFrame(
        () => (s.scroll.viewport.scrollTop = s.scroll.viewport.scrollHeight),
      );
    });

    listenersInitialized = true;
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
