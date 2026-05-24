import type { ProductInput } from "@/types/product";
import type { AnalysisReport } from "@/types/recommendation";

export type AnalyzeProductRequest = {
  product: ProductInput;
};

export type AnalyzeProductSuccessResponse = {
  ok: true;
  data: AnalysisReport;
  source: "api" | "mock_fallback";
  message?: string;
};

export type AnalyzeProductErrorResponse = {
  ok: false;
  error: string;
};

export type AnalyzeProductResponse =
  | AnalyzeProductSuccessResponse
  | AnalyzeProductErrorResponse;
