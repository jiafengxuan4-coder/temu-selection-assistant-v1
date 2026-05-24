export type AIProviderName = "openai" | "qwen" | "doubao" | "deepseek";

export interface AIProviderConfig {
  provider: AIProviderName;
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface AIChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
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
