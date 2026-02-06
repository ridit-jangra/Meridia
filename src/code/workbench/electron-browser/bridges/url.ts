import url from "url";

export const urlBridge = {
  pathToFileURL: (_path: string) => {
    const _url = url.pathToFileURL(_path);
    return _url.href;
  },
};
