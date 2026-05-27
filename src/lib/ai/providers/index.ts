import { deepseekProvider } from "./deepseekProvider";
import { doubaoProvider } from "./doubaoProvider";
import { openaiProvider } from "./openaiProvider";
import { qwenProvider } from "./qwenProvider";
import type {
  AIChatMessage,
  AIProvider,
  AIProviderConfig,
  AIProviderName,
  AIProviderResponse
} from "./types";

const DEFAULT_CONFIG: Record<AIProviderName, { baseUrl: string; model: string }> = {
  openai: {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4.1-mini"
  },
  qwen: {
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen3.6-plus"
  },
  doubao: {
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    model: "doubao-seed-1-6"
  },
  deepseek: {
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-chat"
  }
};

const PROVIDERS: Record<AIProviderName, AIProvider> = {
  openai: openaiProvider,
  qwen: qwenProvider,
  doubao: doubaoProvider,
  deepseek: deepseekProvider
};

function isAIProviderName(value: string): value is AIProviderName {
  return value === "openai" || value === "qwen" || value === "doubao" || value === "deepseek";
}

export function getAIProviderConfig(): AIProviderConfig {
  const providerValue = process.env.AI_PROVIDER ?? "openai";

  if (!isAIProviderName(providerValue)) {
    throw new Error(`不支持的 AI_PROVIDER：${providerValue}`);
  }

  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("缺少 AI_API_KEY，请在 .env.local 中配置。");
  }

  const defaults = DEFAULT_CONFIG[providerValue];

  return {
    provider: providerValue,
    apiKey,
    baseUrl: process.env.AI_BASE_URL || defaults.baseUrl,
    model: process.env.AI_MODEL || defaults.model
  };
}

export function getAIProvider(provider: AIProviderName): AIProvider {
  return PROVIDERS[provider];
}

export type { AIProviderName, AIProviderConfig, AIChatMessage, AIProviderResponse, AIProvider };
