import { Client } from "@ridit/relay/client";
import { monaco } from "./editor.helper";

export const lsp_client = new Client(monaco);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    lsp_client.dispose();
  });
}
