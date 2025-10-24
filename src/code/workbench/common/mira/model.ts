import { GoogleGenAI } from "@google/genai";

export class Model {
  private _api = window.storage.get("gemini-api-key");
  private _model: GoogleGenAI;
  constructor() {
    this._model = new GoogleGenAI({ apiKey: this._api });
  }

  public getModel() {
    return this._model;
  }
}
