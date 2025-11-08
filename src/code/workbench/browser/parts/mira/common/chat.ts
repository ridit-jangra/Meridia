const python = window.python;
const path = window.path;

export class Chat {
  async chat(message: string) {
    const chatPath = path.join([
      path.__dirname,
      "..",
      "..",
      "base",
      "native",
      "python",
      "llm.py",
    ]);
    const chatEngine = await python.executeScript(chatPath, [message]);
    const response = JSON.parse(chatEngine[0]!)["text"];

    return response;
  }
}

export const _chat = new Chat();
