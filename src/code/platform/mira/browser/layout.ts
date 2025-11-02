import { CoreEl } from "../../../workbench/browser/parts/core.js";
import { getIcon } from "../../../workbench/common/utils.js";
import { _mic } from "../common/mic.js";
import { _voice } from "../common/voice.js";

export class Mira extends CoreEl {
  constructor() {
    super();
    this._createEl();
  }

  private async _createEl() {
    this._el = document.createElement("div");
    this._el.className = "mira";

    const scale = document.createElement("div");
    scale.className = "scale-0";

    const circle1 = document.createElement("div");
    circle1.className = "circle circle-1";
    const circle2 = document.createElement("div");
    circle2.className = "circle circle-2";
    const circle3 = document.createElement("div");
    circle3.className = "circle circle-3";

    scale.appendChild(circle1);
    scale.appendChild(circle2);
    scale.appendChild(circle3);

    const transcriptionText = document.createElement("div");
    transcriptionText.className = "transcription-text";

    this._el.appendChild(transcriptionText);
    this._el.appendChild(scale);

    // await _voice.say("The quick brown fox jumps over the lazy dog ");
  }
}
