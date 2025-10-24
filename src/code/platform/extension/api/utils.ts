export const api = {
  workspace: {
    utils: {
      path: {
        join: (...args: string[]) => {
          return window.path.join(args);
        },
        __dirname: window.path.join([window.path.__dirname, "..", ".."]),
      },
    },
  },
};
