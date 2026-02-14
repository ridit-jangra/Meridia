import { ProblemsComponent } from "../components/ProblemsComponenet";
import { TerminalComponent } from "../components/TerminalComponenet";

export const tabs_registery: Record<string, React.FC> = {
  terminal: TerminalComponent,
  problems: ProblemsComponent,
};
