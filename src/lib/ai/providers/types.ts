export type AIProviderName = "openai" | "qwen" | "doubao" | "deepseek";

export interface AIProviderConfig {
  provider: AIProviderName;
  apiKey: string;
  baseUrl: string;
  model: string;
}

export type AITextContentPart = {
  type: "text";
  text: string;
};

export type AIImageContentPart = {
  type: "image_url";
  image_url: {
    url: string;
  };
};

export interface AIChatMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<AITextContentPart | AIImageContentPart>;
}

export interface AIProviderResponse {
  text: string;
  raw?: unknown;
}

export interface AIProvider {
  name: AIProviderName;
  chatCompletion(
    messages: AIChatMessage[],
    config: AIProviderConfig
  ): Promise<AIProviderResponse>;
}
