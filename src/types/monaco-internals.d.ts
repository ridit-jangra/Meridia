declare module "monaco-editor/esm/vs/editor/standalone/browser/standaloneServices" {
  export const StandaloneServices: {
    get<T>(identifier: { type: T }): T;
    get(identifier: any): any;
  };
}

declare module "monaco-editor/esm/vs/editor/common/services/resolverService" {
  export const ITextModelService: any;
}
