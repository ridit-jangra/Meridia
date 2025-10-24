import { PROVIDERS, PROVIDER_MODEL_MAP } from "./llm/base.js";
import type { MiraOptions, CustomMiraModel } from "../types/mira.js";
import type { Model, Provider } from "../types/llm.js";
import { joinWithAnd } from "./common/utils/text.js";

const _validateParams = (
  apiKey: string | undefined,
  options: MiraOptions
): void => {
  if (!apiKey && typeof options.model !== "function") {
  }

  if (
    !options ||
    (typeof options === "object" && Object.keys(options).length === 0)
  ) {
    throw new Error(
      'Please provide required Mira options, such as "model" and "provider".'
    );
  }
};

const _validateInputs = (
  model: Model | CustomMiraModel,
  provider?: Provider
): void => {
  if (typeof model === "function" && provider !== undefined) {
    throw new Error(
      "Provider should not be specified when using a custom model."
    );
  }

  if (
    typeof model !== "function" &&
    (!provider || !PROVIDERS.includes(provider))
  ) {
    throw new Error(
      `Provider must be specified and supported when using built-in models. Please choose from: ${joinWithAnd(
        PROVIDERS
      )}`
    );
  }

  if (
    typeof model === "string" &&
    provider !== undefined &&
    !PROVIDER_MODEL_MAP[provider].includes(model)
  ) {
    throw new Error(
      `Model "${model}" is not supported by the "${provider}" provider. Supported models: ${joinWithAnd(
        PROVIDER_MODEL_MAP[provider]
      )}`
    );
  }
};

export default {
  params: _validateParams,
  inputs: _validateInputs,
};
