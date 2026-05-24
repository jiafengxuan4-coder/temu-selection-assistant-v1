import { generateMockAnalysisReport } from "@/lib/mockAnalysis";
import {
  buildHotProductAnalysisSystemPrompt,
  buildHotProductAnalysisUserPrompt
} from "@/lib/ai/prompts";
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

function extractJsonText(text: string): string {
  const trimmedText = text.trim();
  const fencedJsonMatch = trimmedText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);

  return fencedJsonMatch?.[1]?.trim() ?? trimmedText;
}

function isAnalysisReport(value: unknown): value is AnalysisReport {
  const report = value as Partial<AnalysisReport>;

  return Boolean(
    report &&
      typeof report === "object" &&
      report.input &&
      report.dataCompleteness &&
      report.hotProductAnalysis &&
      report.directCopyRisk &&
      Array.isArray(report.recommendations) &&
      typeof report.finalConclusion === "string" &&
      Array.isArray(report.actionSuggestions)
  );
}

export async function analyzeHotProductWithAI(
  product: ProductInput
): Promise<AIAnalysisResult> {
  let config;

  try {
    config = getAIProviderConfig();
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI Provider 配置异常。";
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
    const parsed = JSON.parse(extractJsonText(response.text)) as unknown;

    if (!isAnalysisReport(parsed)) {
      return fallbackToMock(product, "AI 返回内容结构不符合报告类型，已使用 Mock 兜底分析。");
    }

    return {
      report: parsed,
      source: "api",
      message: `已通过 ${config.provider} Provider 生成报告。`
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";

    return fallbackToMock(
      product,
      `AI Provider 调用失败，已使用 Mock 兜底分析。原因：${message}`
    );
  }
}
