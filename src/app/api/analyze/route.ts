import { NextResponse, type NextRequest } from "next/server";
import { analyzeHotProductWithAI } from "@/lib/ai/analyzeHotProductWithAI";
import { recognizeProductFromImage } from "@/lib/ai/recognizeProductFromImage";
import type { AnalyzeProductRequest, AnalyzeProductResponse } from "@/types/ai";
import type { ProductInput, RecognizedProductFields } from "@/types/product";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function parsePositiveNumber(value: unknown): number | undefined {
  const numberValue = parseOptionalNumber(value);
  return typeof numberValue === "number" && numberValue > 0 ? numberValue : undefined;
}

function parseOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseProduct(value: Record<string, unknown>): ProductInput | null {
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
    imageFileName: parseOptionalString(value.imageFileName),
    imageBase64: parseOptionalString(value.imageBase64),
    imageMimeType: parseOptionalString(value.imageMimeType)
  };
}

function mergeRecognizedProduct(
  rawProduct: Record<string, unknown>,
  recognizedProduct: RecognizedProductFields | null
): Record<string, unknown> {
  return {
    ...recognizedProduct,
    ...rawProduct,
    title: parseOptionalString(rawProduct.title) || recognizedProduct?.title,
    category: parseOptionalString(rawProduct.category) || recognizedProduct?.category,
    price: parsePositiveNumber(rawProduct.price) ?? recognizedProduct?.price,
    weeklySales: parseOptionalNumber(rawProduct.weeklySales) ?? recognizedProduct?.weeklySales,
    monthlySales: parseOptionalNumber(rawProduct.monthlySales) ?? recognizedProduct?.monthlySales,
    rating: parseOptionalNumber(rawProduct.rating) ?? recognizedProduct?.rating,
    reviewsText: parseOptionalString(rawProduct.reviewsText) || recognizedProduct?.reviewsText,
    imageUrl: parseOptionalString(rawProduct.imageUrl),
    imageFileName: parseOptionalString(rawProduct.imageFileName),
    imageBase64: parseOptionalString(rawProduct.imageBase64),
    imageMimeType: parseOptionalString(rawProduct.imageMimeType)
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

  const rawProduct = isRecord(body) && isRecord(body.product) ? body.product : null;

  if (!rawProduct) {
    return jsonResponse({ ok: false, error: "请求体缺少 product。" }, 400);
  }

  const imageBase64 = parseOptionalString(rawProduct.imageBase64);
  const recognizedProduct = imageBase64
    ? await recognizeProductFromImage({
        imageBase64,
        imageMimeType: parseOptionalString(rawProduct.imageMimeType),
        imageFileName: parseOptionalString(rawProduct.imageFileName)
      })
    : null;
  const mergedProduct = mergeRecognizedProduct(rawProduct, recognizedProduct);
  const product = parseProduct(mergedProduct);

  if (!product) {
    const error = imageBase64
      ? "截图识别未能完整获取商品标题、类目或价格，请手动补充后再生成报告。"
      : "请求体缺少 title、category 或有效 price，且 price 必须大于 0。";

    return jsonResponse({ ok: false, error }, 400);
  }

  try {
    const hasImageBase64 = Boolean(imageBase64);
    const analysisProduct: ProductInput = {
      title: product.title,
      category: product.category,
      price: product.price,
      weeklySales: product.weeklySales,
      monthlySales: product.monthlySales,
      rating: product.rating,
      reviewsText: product.reviewsText,
      imageUrl: product.imageUrl,
      imageFileName: product.imageFileName
    };
    const result = await analyzeHotProductWithAI(analysisProduct);
    const imageMessage = hasImageBase64 ? "已启用 Qwen-VL 识别商品截图。" : "";
    const message = [result.message, imageMessage].filter(Boolean).join(" ");

    return jsonResponse(
      {
        ok: true,
        data: result.report,
        source: result.source,
        message,
        recognizedProduct: recognizedProduct ?? undefined
      },
      200
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "分析失败，请稍后重试。";

    return jsonResponse({ ok: false, error: message }, 400);
  }
}
