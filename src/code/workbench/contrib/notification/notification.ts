import { h } from "../core/dom/h";
import { UI_SHOW_NOTIFICATION } from "../../../../../../shared/ipc/channels";

type NotificationType = "info" | "success" | "warning" | "error";

const TYPE_STYLES: Record<NotificationType, string> = {
  info: "bg-[#1e1e2e] border-[#414158] text-[#cdd6f4]",
  success: "bg-[#1e2e1e] border-[#3a5a3a] text-[#a6e3a1]",
  warning: "bg-[#2e2a1e] border-[#5a4e2a] text-[#f9e2af]",
  error: "bg-[#2e1e1e] border-[#5a2a2a] text-[#f38ba8]",
};

function Toast(message: string, type: NotificationType) {
  const styles = TYPE_STYLES[type] ?? TYPE_STYLES.info;

  const el = h("div", {
    class: `flex items-center gap-2 px-3.5 py-2.5 rounded-lg border text-[13px] shadow-lg pointer-events-auto select-none
            transition-all duration-300 opacity-0 translate-y-2 ${styles}`,
  });
  el.textContent = message;

  requestAnimationFrame(() => {
    el.style.opacity = "1";
    el.style.transform = "translateY(0)";
  });

  return el;
}

function create_container() {
  const el = h("div", {
    class:
      "fixed bottom-10 right-4 z-[9999] flex flex-col gap-2 items-end pointer-events-none",
  });
  document.body.appendChild(el);
  return el;
}

export function init_notifications() {
  const container = create_container();

  window.ipc.on(UI_SHOW_NOTIFICATION, (_, message: string, type: NotificationType = "info") => {
    const toast = Toast(message, type);
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(4px)";
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  });
}
