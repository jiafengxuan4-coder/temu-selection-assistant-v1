import { generateMockAnalysisReport } from "@/lib/mockAnalysis";
import type { AnalyzeProductResponse } from "@/types/ai";
import type { ProductInput } from "@/types/product";
import type { AnalysisReport } from "@/types/recommendation";

export type ClientAnalysisSource = "api" | "mock_fallback";

export type ClientAnalysisResult = {
  report: AnalysisReport;
  source: ClientAnalysisSource;
  message?: string;
};

function fallbackToMock(product: ProductInput, message: string): ClientAnalysisResult {
  return {
    report: generateMockAnalysisReport(product),
    source: "mock_fallback",
    message
  };
}

export async function analyzeProductFromClient(
  product: ProductInput
): Promise<ClientAnalysisResult> {
  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ product })
    });

    let result: AnalyzeProductResponse | null = null;

    try {
      result = (await response.json()) as AnalyzeProductResponse;
    } catch {
      return fallbackToMock(product, "分析接口返回异常，已使用 Mock 兜底分析。");
    }

    if (result.ok) {
      return {
        report: result.data,
        source: result.source,
        message: result.message ?? "已通过后端分析接口生成报告。"
      };
    }

    return fallbackToMock(
      product,
      result.error || "API 暂不可用，已使用 Mock 兜底分析。"
    );
  } catch {
    return fallbackToMock(product, "分析接口暂不可用，已使用 Mock 兜底分析。");
  }
}
