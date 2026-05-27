import { generateMockAnalysisReport } from "@/lib/mockAnalysis";
import type { AnalyzeModelInfo, AnalyzeProductResponse } from "@/types/ai";
import type { ProductInput, RecognizedProductFields } from "@/types/product";
import type { AnalysisReport } from "@/types/recommendation";

export type ClientAnalysisSource = "api" | "mock_fallback";

export type ClientAnalysisResult = {
  report: AnalysisReport | null;
  source: ClientAnalysisSource;
  message?: string;
  recognizedFields?: RecognizedProductFields;
  modelInfo?: AnalyzeModelInfo;
};

function fallbackToMock(product: ProductInput, message: string): ClientAnalysisResult {
  return {
    report: generateMockAnalysisReport(product),
    source: "mock_fallback",
    message
  };
}

function isAnalyzeProductResponse(value: unknown): value is AnalyzeProductResponse {
  return typeof value === "object" && value !== null && "ok" in value;
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

    const responseText = await response.text();
    let result: AnalyzeProductResponse | null = null;

    try {
      const parsed = JSON.parse(responseText) as unknown;
      result = isAnalyzeProductResponse(parsed) ? parsed : null;
    } catch {
      if (response.status === 413) {
        return {
          report: null,
          source: "mock_fallback",
          message: "图片数量或图片体积过大，导致分析请求被拒绝。请减少图片数量，或上传裁剪后的关键区域截图后重试。"
        };
      }

      return {
        report: null,
        source: "mock_fallback",
        message: `分析接口返回内容无法解析，请重试。HTTP 状态：${response.status}。`
      };
    }

    if (!result) {
      return {
        report: null,
        source: "mock_fallback",
        message: `分析接口返回结构异常，请重试。HTTP 状态：${response.status}。`
      };
    }

    if (result.ok) {
      return {
        report: result.data,
        source: result.source,
        message: result.message ?? "已通过后端分析接口生成报告。",
        recognizedFields: result.recognizedFields,
        modelInfo: result.modelInfo
      };
    }

    const hasImages = Boolean(product.imageBase64) || Boolean(product.images?.length);

    if (hasImages && (!product.title || !product.category || product.price <= 0)) {
      return {
        report: null,
        source: "mock_fallback",
        message: result.error || "图片识别不完整，请手动补充商品标题、类目和价格。",
        recognizedFields: result.recognizedFields
      };
    }

    return fallbackToMock(product, `API 返回错误，已显示演示数据。原因：${result.error || "接口暂不可用"}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "网络请求失败";
    const timeoutMessage = message.toLowerCase().includes("abort") || message.includes("超时")
      ? "请求超时，已显示演示数据。请减少图片数量或手动补充基础字段后重试。"
      : `分析接口暂不可用，已显示演示数据。原因：${message}`;

    return fallbackToMock(product, timeoutMessage);
  }
}
