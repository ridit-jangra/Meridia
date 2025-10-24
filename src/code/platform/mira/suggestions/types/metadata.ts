export type Endpoint = string;
export type Filename = string;
export type Technologies = string[];
export type RelatedFile = {
  path: string;
  content: string;
};

export interface BaseMiraMetadata {
  language: string | undefined;
  filename: Filename | undefined;
  technologies: Technologies | undefined;
  relatedFiles: RelatedFile[] | undefined;
  textAfterCursor: string;
  textBeforeCursor: string;
  cursorPosition: {
    readonly lineNumber: number;
    readonly column: number;
  };
}
