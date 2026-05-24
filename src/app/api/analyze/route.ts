import { NextResponse, type NextRequest } from "next/server";
import { analyzeHotProductWithAI } from "@/lib/ai/analyzeHotProductWithAI";
import type { AnalyzeProductRequest, AnalyzeProductResponse } from "@/types/ai";
import type { ProductInput } from "@/types/product";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function parseOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseProduct(value: unknown): ProductInput | null {
  if (!isRecord(value)) {
    return null;
  }

  const title = parseOptionalString(value.title);
  const category = parseOptionalString(value.category);
  const price = parseOptionalNumber(value.price);

  if (!title || !category || typeof price !== "number" || price <= 0) {
    return null;
  }

  return {
    title,
    category,
    price,
    weeklySales: parseOptionalNumber(value.weeklySales),
    monthlySales: parseOptionalNumber(value.monthlySales),
    rating: parseOptionalNumber(value.rating),
    reviewsText: parseOptionalString(value.reviewsText),
    imageUrl: parseOptionalString(value.imageUrl),
    imageFileName: parseOptionalString(value.imageFileName)
  };
}

function jsonResponse(body: AnalyzeProductResponse, status: number) {
  return NextResponse.json(body, { status });
}

export async function POST(request: NextRequest) {
  let body: AnalyzeProductRequest | null = null;

  try {
    body = (await request.json()) as AnalyzeProductRequest;
  } catch {
    return jsonResponse({ ok: false, error: "请求体必须是合法 JSON。" }, 400);
  }

  const product = parseProduct(isRecord(body) ? body.product : null);

  if (!product) {
    return jsonResponse(
      { ok: false, error: "请求体缺少 title、category 或有效 price，且 price 必须大于 0。" },
      400
    );
  }

  try {
    const result = await analyzeHotProductWithAI(product);
    return jsonResponse(
      {
        ok: true,
        data: result.report,
        source: result.source,
        message: result.message
      },
      200
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "分析失败，请稍后重试。";

    return jsonResponse({ ok: false, error: message }, 400);
  }
}
