import { generateMockAnalysisReport } from "@/lib/mockAnalysis";
import {
  buildHotProductAnalysisSystemPrompt,
  buildHotProductAnalysisUserPrompt
} from "@/lib/ai/prompts";
import { parseAIAnalysisReport } from "@/lib/ai/parseAIAnalysisReport";
import { getAIProvider, getAIProviderConfig } from "@/lib/ai/providers";
import type { ProductInput } from "@/types/product";
import type { AnalysisReport } from "@/types/recommendation";

export type AIAnalysisResult = {
  report: AnalysisReport;
  source: "api" | "mock_fallback";
  message?: string;
};

function fallbackToMock(product: ProductInput, message: string): AIAnalysisResult {
  const report = generateMockAnalysisReport(product);

  return {
    report: {
      ...report,
      actionSuggestions: [message, ...report.actionSuggestions]
    },
    source: "mock_fallback",
    message
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export async function analyzeHotProductWithAI(
  product: ProductInput
): Promise<AIAnalysisResult> {
  let config;

  try {
    config = getAIProviderConfig();
  } catch (error) {
    const message = getErrorMessage(error, "AI Provider 配置异常。");
    console.warn("[AI_ANALYZE_CONFIG_FAILED]", {
      provider: "unknown",
      errorType: "config",
      message
    });
    return fallbackToMock(product, `AI Provider 配置失败，已使用 Mock 兜底分析。原因：${message}`);
  }

  try {
    const provider = getAIProvider(config.provider);
    const response = await provider.chatCompletion(
      [
        {
          role: "system",
          content: buildHotProductAnalysisSystemPrompt()
        },
        {
          role: "user",
          content: buildHotProductAnalysisUserPrompt(product)
        }
      ],
      config
    );
    const report = parseAIAnalysisReport({
      product,
      rawText: response.text
    });

    return {
      report,
      source: "api",
      message: `已通过 AI Provider 生成报告。当前 provider：${config.provider}。`
    };
  } catch (error) {
    const message = getErrorMessage(error, "未知错误");
    const isParseError = message.includes("解析") || message.includes("结构");
    const fallbackMessage = isParseError
      ? `AI 返回内容解析失败，已使用 Mock 兜底分析。原因：${message}`
      : `AI Provider 调用失败，已使用 Mock 兜底分析。原因：${message}`;

    console.warn("[AI_ANALYZE_FALLBACK]", {
      provider: config.provider,
      errorType: isParseError ? "parse" : "provider",
      message
    });

    return fallbackToMock(product, fallbackMessage);
  }
}
