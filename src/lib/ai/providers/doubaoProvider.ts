import type { AIProvider, AIProviderConfig, AIChatMessage, AIProviderResponse } from "./types";

function getChatCompletionsUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/chat/completions`;
}

function extractText(data: unknown): string {
  const content = (data as { choices?: Array<{ message?: { content?: unknown } }> }).choices?.[0]?.message?.content;

  if (typeof content !== "string" || !content.trim()) {
    throw new Error("AI Provider 未返回可解析文本。");
  }

  return content;
}

export const doubaoProvider: AIProvider = {
  name: "doubao",
  async chatCompletion(
    messages: AIChatMessage[],
    config: AIProviderConfig
  ): Promise<AIProviderResponse> {
    const response = await fetch(getChatCompletionsUrl(config.baseUrl), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: 0.3
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Doubao Provider 调用失败：${response.status}`);
    }

    return {
      text: extractText(data),
      raw: data
    };
  }
};
