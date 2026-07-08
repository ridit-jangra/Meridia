export interface LspServerDefinition {
  languageId: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  resolve?: () => { command: string; args?: string[] } | null;
}
