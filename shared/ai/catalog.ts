// Provider + model catalog for the AI chat. `ai_provider`/`ai_model` in settings
// are free-form strings; these are the suggestions surfaced in the UI dropdowns.

export const AI_PROVIDERS = [
  "openrouter",
  "openai",
  "anthropic",
  "google",
  "groq",
  "ollama",
  "hackclub",
] as const;

export type AiProvider = (typeof AI_PROVIDERS)[number];

export const AI_MODELS: Record<string, string[]> = {
  openrouter: [
    "deepseek/deepseek-v4-flash",
    "anthropic/claude-sonnet-5",
    "anthropic/claude-opus-4.8",
    "openai/gpt-4o",
    "google/gemini-2.5-pro",
  ],
  openai: ["gpt-4o", "gpt-4o-mini", "o4-mini"],
  anthropic: ["claude-opus-4-8", "claude-sonnet-5", "claude-haiku-4-5-20251001"],
  google: ["gemini-2.5-pro", "gemini-2.5-flash"],
  groq: ["llama-3.3-70b-versatile", "openai/gpt-oss-20b"],
  ollama: ["llama3.2", "qwen2.5-coder"],
  hackclub: ["default"],
};

export function models_for(provider: string): string[] {
  return AI_MODELS[provider] ?? [];
}
