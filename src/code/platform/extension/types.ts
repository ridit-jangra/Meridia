import { IConnection } from "vscode-ws-jsonrpc/server";

export interface ILanguageServerConfig {
  name: string;
  language: string;
  connection: IConnection;
  port: number;
}
