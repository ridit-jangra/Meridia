import { Client } from "./relay/client";
import { monaco } from "./editor.helper";
import { init_agent_lsp_bridge } from "./relay/agent-bridge";

export const lsp_client = new Client(monaco);

// Lets the AI agent query the live language servers (diagnostics, hover,
// definition, references, symbols) over IPC.
init_agent_lsp_bridge(lsp_client);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    lsp_client.dispose();
  });
}
