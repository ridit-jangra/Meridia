const path = window.path;
const python = window.python;
const fs = window.fs;

export class Voice {
  async transcribe(_wavPath: string) {
    const _scriptPath = path.join([
      path.__dirname,
      "..",
      "..",
      "base",
      "native",
      "python",
      "text.py",
    ]);

    const result = await python.executeScript(_scriptPath, [_wavPath]);
    const resultString = Array.isArray(result) ? result.join("") : result;
    const transcription = JSON.parse(resultString)["words"];

    return transcription as Array<{ text: string; start: number; end: number }>;
  }

  async say(_text: string) {
    const _scriptPath = path.join([
      path.__dirname,
      "..",
      "..",
      "base",
      "native",
      "python",
      "voice.py",
    ]);

    const _voiceInstance = await python.executeScript(_scriptPath, [
      _text,
      `${crypto.randomUUID()}.wav`,
    ]);

    const _wavPath = JSON.parse(_voiceInstance[0]!)["filepath"];

    const _transcription = await this.transcribe(_wavPath);

    const _transcriptionEl = document.querySelector(
      ".transcription-text"
    ) as HTMLDivElement;

    _transcription.forEach((w, index) => {
      const _el = document.createElement("span");
      _el.textContent = w.text + " ";
      _el.setAttribute("data-word-index", String(index));
      _transcriptionEl.appendChild(_el);
    });

    const _wavContent = await fs.readFile(_wavPath, "base64");

    const binaryString = atob(_wavContent);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const audioBlob = new Blob([bytes], { type: "audio/wav" });
    const audioUrl = URL.createObjectURL(audioBlob);

    const audio = new Audio(audioUrl);

    audio.addEventListener("ended", () => {
      _transcriptionEl.innerHTML = "";
    });

    audio.addEventListener("timeupdate", () => {
      const currentTime = audio.currentTime;

      _transcription.forEach((word: any, index: number) => {
        if (
          currentTime >= word.start &&
          currentTime < word.end &&
          !word.logged
        ) {
          _transcriptionEl.querySelectorAll("span").forEach((w) => {
            w.classList.remove("active");
          });

          const _el = _transcriptionEl.querySelector(
            `[data-word-index="${index}"]`
          ) as HTMLSpanElement;
          _el.classList.add("active");

          word.logged = true;
        }
      });
    });

    audio.play();
  }
}

export const _voice = new Voice();
