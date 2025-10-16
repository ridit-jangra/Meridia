import { Chat } from "../../../workbench/common/workbench.mira/workbench.mira.chat";
import { _voice } from "./mira.engine.voice";

export class Mic {
  private _pyshell: any | null = null;
  private isListening: boolean = false;
  private currentDir: string;
  private _path: string;
  private _isProcessingRequest: boolean = false;
  private _pendingTranscriptions: string[] = [];

  constructor() {
    this.currentDir = window.path.__dirname;
    this._path = window.path.join([this.currentDir, "scripts", "mic.py"]);
  }

  private _cleanTranscription(text: string): string | null {
    if (!text || typeof text !== "string") {
      return null;
    }

    let cleanText = text.replace(
      /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu,
      ""
    );

    cleanText = cleanText.replace(
      /[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}-\u{2454}]|[\u{20D0}-\u{20FF}]/gu,
      ""
    );

    cleanText = cleanText.trim();

    const noisePatterns = [
      /^\[BLANK\]$/i,
      /^\[BLANK_AUDIO\]$/i,
      /^\[BOOM\]$/i,
      /^\[BELL_RINGING\]$/i,
      /^\[LAUGHING\]$/i,
      /^\[INAUDIBLE\]$/i,
      /^\[Speaking Spanish\]$/i,
      /^\[MUSIC\]$/i,
      /^\[NOISE\]$/i,
      /^\[APPLAUSE\]$/i,
      /^\[LAUGHTER\]$/i,
      /^\[laughs\]$/i,
      /^\[laughing\]$/i,
      /^\[GIGGLES\]$/i,
      /^\[audience laughs\]$/i,
      /^\[COUGH\]$/i,
      /^\[coughing\]$/i,
      /^\[GUNFIRE\]$/i,
      /^\[SILENCE\]$/i,
      /^\[UNKNOWN\]$/i,
      /^\[MUSIC PLAYING\]$/i,
      /^\.+$/,
      /^-+$/,
      /^,+$/,
      /^\s*$/,
      /^[^\w\s]*$/,
      /^(uh|um|ah|oh|hmm|mm)$/i,
    ];

    for (const pattern of noisePatterns) {
      if (pattern.test(cleanText)) {
        return null;
      }
    }

    if (cleanText.length < 3) {
      return null;
    }

    return cleanText;
  }

  public _start(): void {
    if (this.isListening) {
      return;
    }

    try {
      this._pyshell = window.python.createStreamingShell(this._path, []);

      if (!this._pyshell) {
        return;
      }

      this.isListening = true;

      this._pyshell.onMessage((message: string) => {
        this._handleData(message);
      });

      this._pyshell.onError((error: Error) => {
        this.isListening = false;
        this._pyshell = null;
        this._isProcessingRequest = false;
      });

      this._pyshell.onClose(() => {
        this.isListening = false;
        this._pyshell = null;
        this._isProcessingRequest = false;
      });
    } catch (error) {
      this.isListening = false;
      this._isProcessingRequest = false;
    }
  }

  public _stop(): void {
    if (!this.isListening || !this._pyshell) {
      return;
    }

    try {
      this._pyshell.terminate();

      setTimeout(() => {
        if (this._pyshell && this.isListening) {
          this._pyshell.kill();
        }
      }, 5000);
    } catch (error) {}

    this.isListening = false;
    this._isProcessingRequest = false;
    this._pendingTranscriptions = [];
  }

  private async _handleData(data: string) {
    try {
      if (
        data.trim().startsWith("{") &&
        (data.includes('"partial"') || data.includes('"text"'))
      ) {
        const result = JSON.parse(data);

        if (result.partial !== undefined) {
          const cleanPartial = this._cleanTranscription(result.partial);
          if (cleanPartial) {
            this._onPartialTranscription(cleanPartial);
          }
        } else if (result.text !== undefined) {
          const cleanText = this._cleanTranscription(result.text);

          if (!cleanText) {
            return;
          }

          if (this._isProcessingRequest) {
            this._pendingTranscriptions.push(cleanText);
            this._onFinalTranscription({ ...result, text: cleanText }, true);
            return;
          }

          await this._processTranscription(cleanText, {
            ...result,
            text: cleanText,
          });
        }
      } else {
      }
    } catch (error) {}
  }

  private async _processTranscription(
    text: string,
    result: any
  ): Promise<void> {
    this._isProcessingRequest = true;

    try {
      this._onFinalTranscription(result, false);

      await _voice.say(result.text);
    } catch (error) {
    } finally {
      this._isProcessingRequest = false;

      if (this._pendingTranscriptions.length > 0) {
        const nextText = this._pendingTranscriptions.shift()!;

        setTimeout(() => {
          this._processTranscription(nextText, { text: nextText });
        }, 500);
      }
    }
  }

  private _onPartialTranscription(partialText: string): void {
    const transcriptionElement = document.getElementById("liveTranscription");
    if (transcriptionElement) {
      const statusIndicator = this._isProcessingRequest ? " (processing)" : "";
      transcriptionElement.textContent = partialText + statusIndicator;
      transcriptionElement.style.opacity = "0.7";
    }

    window.dispatchEvent(
      new CustomEvent("voicePartial", {
        detail: { text: partialText },
      })
    );
  }

  private _onFinalTranscription(result: any, isQueued: boolean = false): void {
    const transcriptionElement = document.getElementById("liveTranscription");
    if (transcriptionElement) {
      const statusIndicator = isQueued
        ? " (queued)"
        : this._isProcessingRequest
          ? " (processing)"
          : "";
      transcriptionElement.textContent = result.text + statusIndicator;
      transcriptionElement.style.opacity = "1";
    }

    const historyElement = document.getElementById("transcriptionHistory");
    if (historyElement) {
      const resultDiv = document.createElement("div");
      resultDiv.className = `transcription-result ${isQueued ? "queued" : ""}`;
      resultDiv.innerHTML = `
        <div class="timestamp">${new Date().toLocaleTimeString()}</div>
        <div class="text">${result.text} ${isQueued ? "(queued)" : ""}</div>
      `;
      historyElement.appendChild(resultDiv);
      historyElement.scrollTop = historyElement.scrollHeight;
    }

    window.dispatchEvent(
      new CustomEvent("voiceFinal", {
        detail: { result, isQueued },
      })
    );
  }

  public get listening(): boolean {
    return this.isListening;
  }

  public get processing(): boolean {
    return this._isProcessingRequest;
  }

  public get queueLength(): number {
    return this._pendingTranscriptions.length;
  }

  public clearQueue(): void {
    this._pendingTranscriptions = [];
  }
}

export const _mic = new Mic();
