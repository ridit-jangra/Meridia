import { monaco } from "./editor.helper";

monaco.editor.registerLinkOpener({
  open(resource) {
    const url = resource.toString();
    if (url.startsWith("http://") || url.startsWith("https://")) {
      window.shell.open_external(url);
      return true;
    }
    return false;
  },
});
