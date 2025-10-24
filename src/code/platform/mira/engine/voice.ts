const path = window.path;
const python = window.python;
const fs = window.fs;

export class Voice {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private _analyzing: boolean = false;

  private _audioQueue: Array<() => Promise<string>> = [];
  private _isPlaying = false;
  private _currentWindowStart = 0;

  constructor() {}

  private _audioAnalysis(audioElement: HTMLAudioElement) {
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;

    const source = this.audioContext.createMediaElementSource(audioElement);
    source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);

    this.dataArray = new Uint8Array(
      new ArrayBuffer(this.analyser.frequencyBinCount)
    );

    const circles = document.querySelectorAll(".circle");

    const _analyze = () => {
      if (!this._analyzing || !this.analyser || !this.dataArray) return;

      this.analyser.getByteFrequencyData(this.dataArray as any);

      const volume =
        this.dataArray.reduce((a, b) => a + b) / this.dataArray.length;

      const scale = 1 + (volume / 255) * 1.5;
      const rotationDuration = Math.max(4, 10 - (volume / 255) * 10);

      const _baseRadius = 48;
      const _radiusVariation = (volume / 255) * 14;
      const _radius = _baseRadius - _radiusVariation;

      const _blur = 20;
      const _spread = 10;
      const _shadowMultiplier = 1 + (volume / 255) * 3;

      const newBlur = _blur * _shadowMultiplier;
      const newSpread = _spread * _shadowMultiplier;

      circles.forEach((circle: any) => {
        circle.style.transform = `translate(-50%, -50%) scale(${scale})`;
        circle.style.animationDuration = `${rotationDuration}s`;

        circle.style.setProperty("--dynamic-border-radius", `${_radius}%`);
        circle.style.boxShadow = `0 0 ${newBlur}px ${newSpread}px rgba(var(--color-orange), 0.05)`;

        circle.style.transition =
          "border-radius 0.3s ease-out, box-shadow 0.2s ease-out";
      });

      requestAnimationFrame(_analyze);
    };

    this._analyzing = true;
    _analyze();
  }

  private _renderWindow(
    words: any[],
    transcriptionElement: HTMLElement,
    windowStart: number,
    windowSize: number = 8
  ) {
    let html = "";

    const endIndex = Math.min(words.length, windowStart + windowSize);
    const visibleWords = words.slice(windowStart, endIndex);

    for (let i = 0; i < visibleWords.length; i++) {
      const word = visibleWords[i];
      const wordIndex = windowStart + i;

      html += `<span class="transcription-word" data-index="${wordIndex}">${word.word}</span>`;
      if (i < visibleWords.length - 1) {
        html += " ";
      }
    }

    transcriptionElement.innerHTML = html;
  }

  private _highlight(
    currentWordIndex: number,
    transcriptionElement: HTMLElement
  ) {
    transcriptionElement
      .querySelectorAll(".transcription-word")
      .forEach((span) => span.classList.remove("highlight"));

    if (currentWordIndex >= 0) {
      const span = transcriptionElement.querySelector(
        `.transcription-word[data-index="${currentWordIndex}"]`
      );
      if (span) span.classList.add("highlight");
    }
  }

  private _updateWindow(
    words: any[],
    transcriptionElement: HTMLElement,
    currentWordIndex: number,
    windowSize: number = 8
  ) {
    const windowEnd = this._currentWindowStart + windowSize - 1;

    if (
      currentWordIndex < this._currentWindowStart ||
      currentWordIndex > windowEnd
    ) {
      this._currentWindowStart = Math.max(0, currentWordIndex);

      this._renderWindow(
        words,
        transcriptionElement,
        this._currentWindowStart,
        windowSize
      );
    }

    this._highlight(currentWordIndex, transcriptionElement);
  }

  private async _processQueue(): Promise<void> {
    if (this._isPlaying || this._audioQueue.length === 0) {
      return;
    }

    this._isPlaying = true;

    while (this._audioQueue.length > 0) {
      const nextAudio = this._audioQueue.shift();
      if (nextAudio) {
        await nextAudio();
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    this._isPlaying = false;
  }

  private async _playSingle(message: string): Promise<string> {
    const voiceScriptPath = path.join([path.__dirname, "scripts", "voice.py"]);
    const response = await python.executeScript(voiceScriptPath, [
      message,
      `${crypto.randomUUID()}.wav`,
    ]);

    const _json = JSON.parse(JSON.stringify(response));
    const voiceWavPath = JSON.parse(_json)["filepath"];

    const extractScriptPath = path.join([
      path.__dirname,
      "scripts",
      "extract_text.py",
    ]);
    const transcribeResponse = await python.executeScript(extractScriptPath, [
      voiceWavPath,
      "--model-size",
      "tiny",
    ]);

    const transcriptionJsonString = transcribeResponse.join("\n");
    const words: { word: string; start: number; end: number }[] = JSON.parse(
      transcriptionJsonString
    );

    const transcriptionElement = document.getElementById("transcriptionText");
    if (!transcriptionElement) {
      return voiceWavPath;
    }

    return new Promise((resolve, reject) => {
      try {
        const buffer = fs.readFileBuffer(voiceWavPath);
        const uint8Array = new Uint8Array(buffer as any);
        const audioBlob = new Blob([uint8Array], { type: "audio/wav" });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        this._audioAnalysis(audio);

        this._currentWindowStart = 0;

        const _update = () => {
          if (!audio) return;
          const currentTime = audio.currentTime;

          let idx = 0;
          while (idx < words.length && words[idx]!.start <= currentTime) {
            idx++;
          }
          const currentWordIndex = idx - 1;

          this._updateWindow(words, transcriptionElement, currentWordIndex, 8);

          if (idx < words.length) {
            requestAnimationFrame(_update);
          }
        };

        audio.onplay = () => {
          this._renderWindow(words, transcriptionElement, 0, 8);
          requestAnimationFrame(_update);
        };

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          this._analyzing = false;
          if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
          }

          transcriptionElement.innerHTML = "";
          resolve(voiceWavPath);
        };

        audio.onerror = (err) => {
          this._analyzing = false;
          if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
          }
          reject(err);
        };

        audio.play().catch((err) => {
          this._analyzing = false;
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  public async say(message: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this._audioQueue.push(async () => {
        try {
          const result = await this._playSingle(message);
          resolve(result);
          return result;
        } catch (err) {
          reject(err);
          return "";
        }
      });

      if (!this._isPlaying) {
        this._processQueue().catch(reject);
      }
    });
  }
}

export const _voice = new Voice();
