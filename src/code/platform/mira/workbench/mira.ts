import { Mira as MiraLayout } from "./browser/layout.js";
import { registerStandalone } from "../../../workbench/common/standalone.js";
import { createFile } from "../actions/files.js";

export class Mira {
  constructor() {
    new MiraLayout();
  }
}

const _mira = new Mira();
registerStandalone("mira", _mira);
