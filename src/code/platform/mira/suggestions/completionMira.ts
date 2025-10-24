import { Mira } from "./core/mira.js";
import { type PromptData } from "./types/mira.js";
import { buildPrompt } from "./prompt.js";
import type {
  CompletionMetadata,
  CompletionRequest,
  CompletionResponse,
} from "./types/core.js";

export class CompletionMira extends Mira<CompletionMetadata> {
  public async complete(
    request: CompletionRequest
  ): Promise<CompletionResponse> {
    const { body, options } = request;
    const { customPrompt, aiRequestHandler } = options ?? {};
    const { completionMetadata } = body;

    const { text, raw, error } = await this.makeAIRequest(completionMetadata, {
      customPrompt,
      aiRequestHandler,
    });

    return { completion: text, raw, error };
  }

  protected getDefaultPrompt(metadata: CompletionMetadata): PromptData {
    return buildPrompt(metadata);
  }
}
