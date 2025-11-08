import { CoreEl } from "../../core.js";
import { _mic } from "../common/mic.js";
import { _voice } from "../common/voice.js";
import { getThemeIcon } from "../../../media/icons.js";
import { _chat } from "../common/chat.js";

export class Mira extends CoreEl {
  constructor() {
    super();
    this._createEl();
  }

  async _send(_message: string) {
    const response = await _chat.chat(_message);
    _voice.say(response);
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

    const textbox = document.createElement("div");
    textbox.className = "textbox";

    const input = document.createElement("input");
    input.className = "input";
    input.placeholder = "Ask Mira.";

    const sendButton = document.createElement("span");
    sendButton.innerHTML = getThemeIcon("send");

    const micButton = document.createElement("span");
    micButton.innerHTML = getThemeIcon("mic");

    sendButton.onclick = () => {
      const currentText = input.value.trim();
      this._send(currentText);
      input.value = "";
    };

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const currentText = input.value.trim();
        this._send(currentText);
        input.value = "";
      }
    });

    textbox.appendChild(input);
    textbox.appendChild(micButton);
    textbox.appendChild(sendButton);

    this._el.appendChild(scale);
    this._el.appendChild(transcriptionText);
    this._el.appendChild(textbox);
  }
}
