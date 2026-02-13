import { ChatPanel } from "../panels/ChatPanel";
import { EditorArea } from "../editor/EditorArea";
import { Explorer } from "../explorer/Explorer";
import { ProblemsPanel } from "../panels/ProblemsPanel";
import { TerminalPanel } from "../panels/TerminalPanel";
import { GitPanel } from "../panels/GitPanel";
import { SearchPanel } from "../panels/SearchPanel";

export const panels: Record<string, React.FC> = {
  explorer: Explorer,
  editor: EditorArea,
  terminal: TerminalPanel,
  problems: ProblemsPanel,
  ai_chat: ChatPanel,
  git: GitPanel,
  search: SearchPanel,
};
