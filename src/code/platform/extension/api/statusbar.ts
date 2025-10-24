import { IStatusBarAction } from "../../../workbench/types.js";
import { _contextEvent } from "../common/context.js";

export const api = {
  window: {
    createStatusBarItem: (action: IStatusBarAction) => {
      _contextEvent.send("workbench.statusbar.register.action", action);
    },
    removeStatusBarItem: (_innerHtml: string) => {
      _contextEvent.send("workbench.statusbar.remove.action", _innerHtml);
    },
  },
};
