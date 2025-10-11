export const api = {
  workspace: {
    storage: {
      get: (_key: string) => {
        return window.storage.get(_key);
      },
    },
  },
};
