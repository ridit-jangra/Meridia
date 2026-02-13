import { ChatPanel } from "../panels/ChatPanel";
import { EditorArea } from "../editor/EditorArea";
import { Explorer } from "../explorer/Explorer";
import { ProblemsPanel } from "../panels/ProblemsPanel";
import { TerminalPanel } from "../panels/TerminalPanel";

export const panels: Record<string, React.FC> = {
  explorer: Explorer,
  editor: EditorArea,
  terminal: TerminalPanel,
  problems: ProblemsPanel,
  ai_chat: ChatPanel,
};
