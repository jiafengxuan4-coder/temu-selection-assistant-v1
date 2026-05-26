import { NextResponse, type NextRequest } from "next/server";
import { analyzeHotProductWithAI } from "@/lib/ai/analyzeHotProductWithAI";
import { recognizeProductFromImage, recognizeProductFromImages } from "@/lib/ai/recognizeProductFromImage";
import { inferCategoryFromProductInfo } from "@/lib/inferCategory";
import type { AnalyzeProductRequest, AnalyzeProductResponse } from "@/types/ai";
import type { ProductImageInput, ProductInput, ProductPriceCandidate, RecognizedProductFields } from "@/types/product";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function createRequestId(): string {
  return Math.random().toString(36).slice(2, 8);
}

function estimateBase64ImageSize(imageBase64: string): number {
  const base64 = imageBase64.includes(",") ? imageBase64.split(",").pop() ?? "" : imageBase64;
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.round((base64.length * 3) / 4 - padding));
}

function getImageSizeSummaries(images: ProductImageInput[]): string[] {
  return images.map((image, index) => {
    const sizeMb = estimateBase64ImageSize(image.imageBase64) / 1024 / 1024;
    return `image${index + 1}:${sizeMb.toFixed(2)}MB`;
  });
}

function parseOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : undefined;
  }

  return undefined;
}

function parsePositiveNumber(value: unknown): number | undefined {
  const numberValue = parseOptionalNumber(value);
  return typeof numberValue === "number" && numberValue > 0 ? numberValue : undefined;
}

function parseOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function parseProductSpecs(value: unknown): ProductInput["productSpecs"] | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const productSpecs = {
    mainProductSpec: parseOptionalString(value.mainProductSpec),
    accessorySpec: parseOptionalString(value.accessorySpec),
    productSize: parseOptionalString(value.productSize),
    packageWeight: parseOptionalString(value.packageWeight),
    packageSize: parseOptionalString(value.packageSize),
    colorSizeOptions: parseOptionalString(value.colorSizeOptions)
  };

  return Object.values(productSpecs).some(Boolean) ? productSpecs : undefined;
}

function mergeProductSpecs(
  manualSpecs: ProductInput["productSpecs"],
  recognizedProduct: RecognizedProductFields | null
): ProductInput["productSpecs"] | undefined {
  const productSpecs = {
    mainProductSpec: manualSpecs?.mainProductSpec ?? recognizedProduct?.recognizedSpecInfo,
    accessorySpec: manualSpecs?.accessorySpec,
    productSize: manualSpecs?.productSize ?? recognizedProduct?.recognizedSizeInfo,
    packageWeight: manualSpecs?.packageWeight,
    packageSize: manualSpecs?.packageSize ?? recognizedProduct?.recognizedWeightDimensionInfo,
    colorSizeOptions: manualSpecs?.colorSizeOptions ?? recognizedProduct?.recognizedColorStyleInfo
  };

  return Object.values(productSpecs).some(Boolean) ? productSpecs : undefined;
}
function parseImageInputs(value: unknown): ProductImageInput[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(0, 10)
    .filter(isRecord)
    .map((item) => {
      const imageBase64 = parseOptionalString(item.imageBase64);
      const imageMimeType = parseOptionalString(item.imageMimeType);
      const imageFileName = parseOptionalString(item.imageFileName);

      return imageBase64 && imageMimeType && imageFileName
        ? { imageBase64, imageMimeType, imageFileName }
        : null;
    })
    .filter((item): item is ProductImageInput => item !== null);
}

function hasManualPrice(value: unknown): boolean {
  return typeof parsePositiveNumber(value) === "number";
}
function choosePrimaryPriceCandidate(
  candidates: ProductPriceCandidate[] | undefined
): ProductPriceCandidate | undefined {
  if (!candidates || candidates.length === 0) {
    return undefined;
  }

  const priority: Array<ProductPriceCandidate["source"]> = [
    "final_price",
    "estimated_price",
    "coupon_price",
    "discount_price",
    "current_sale_price",
    "previous_price",
    "original_price",
    "strikethrough_price",
    "uncertain",
    "other"
  ];

  return priority
    .map((source) => candidates.find((candidate) => candidate.source === source))
    .find((candidate): candidate is ProductPriceCandidate => Boolean(candidate))
    ?? candidates[0];
}

function getRecognizedMissingFields(recognizedProduct: RecognizedProductFields): string[] {
  const missingFields: string[] = [];

  if (!recognizedProduct.title) {
    missingFields.push("title");
  }

  if (!recognizedProduct.category) {
    missingFields.push("category");
  }

  if (typeof recognizedProduct.price !== "number") {
    missingFields.push("price");
  }

  if (typeof recognizedProduct.weeklySales !== "number" && typeof recognizedProduct.monthlySales !== "number") {
    missingFields.push("sales");
  }

  if (typeof recognizedProduct.rating !== "number") {
    missingFields.push("rating");
  }

  if (!recognizedProduct.reviewsText) {
    missingFields.push("reviewsText");
  }

  return missingFields;
}
function normalizeRecognizedProduct(
  recognizedProduct: RecognizedProductFields | null
): RecognizedProductFields | null {
  if (!recognizedProduct) {
    return null;
  }

  const primaryCandidate = choosePrimaryPriceCandidate(recognizedProduct.priceCandidates);
  const inferredCategory = recognizedProduct.category
    ? undefined
    : inferCategoryFromProductInfo({ recognizedTitle: recognizedProduct.title });
  const baseProduct: RecognizedProductFields = {
    ...recognizedProduct,
    category: recognizedProduct.category ?? inferredCategory,
    inferredCategory: recognizedProduct.inferredCategory ?? inferredCategory,
    categorySource: recognizedProduct.category
      ? "recognized"
      : inferredCategory
        ? "inferred"
        : recognizedProduct.categorySource ?? "unknown",
    warnings: inferredCategory
      ? [
          ...(recognizedProduct.warnings ?? []),
          "商品类目由标题推断得到，建议人工核对。"
        ]
      : recognizedProduct.warnings
  };

  if (typeof baseProduct.price === "number" || !primaryCandidate) {
    return {
      ...baseProduct,
      missingFields: getRecognizedMissingFields(baseProduct)
    };
  }

  const normalizedProduct: RecognizedProductFields = {
    ...baseProduct,
    price: primaryCandidate.value,
    priceDisplay: primaryCandidate.display,
    priceCurrency: primaryCandidate.currency,
    priceSource: primaryCandidate.source === "other" ? undefined : primaryCandidate.source,
    warnings: [
      ...(baseProduct.warnings ?? []),
      "已根据识别到的价格候选补齐商品主价格，建议人工核对。"
    ]
  };

  return {
    ...normalizedProduct,
    missingFields: getRecognizedMissingFields(normalizedProduct)
  };
}

function getMissingProductFields(value: Record<string, unknown>): string[] {
  const missingFields: string[] = [];

  if (!parseOptionalString(value.title)) {
    missingFields.push("商品标题");
  }

  if (!parseOptionalString(value.category)) {
    missingFields.push("商品类目");
  }

  if (typeof parsePositiveNumber(value.price) !== "number") {
    missingFields.push("商品价格");
  }

  return missingFields;
}

function buildMissingProductMessage(missingFields: string[], hasSubmittedImages: boolean): string {
  if (missingFields.length === 0) {
    return hasSubmittedImages
      ? "未从图片中识别到完整商品信息，系统已将这些图片作为产品参考素材使用。请补充商品标题、类目、价格等基础信息后继续生成报告。"
      : "请求体缺少 title、category 或有效 price，且 price 必须大于 0。";
  }

  return hasSubmittedImages
    ? `未从图片中识别到完整商品信息，系统已将这些图片作为产品参考素材使用。请补充商品标题、类目、价格等基础信息后继续生成报告。当前缺少：${missingFields.join("、")}。`
    : `请求体缺少${missingFields.join("、")}，请补充后再生成报告。`;
}

function getFinalProductSources(
  rawProduct: Record<string, unknown>,
  recognizedProduct: RecognizedProductFields | null
) {
  return {
    productNameSource: parseOptionalString(rawProduct.title)
      ? "manual"
      : recognizedProduct?.cleanedProductName || recognizedProduct?.rawRecognizedTitle || recognizedProduct?.title
        ? "image_recognition"
        : "ai_fallback",
    categorySource: parseOptionalString(rawProduct.category)
      ? "manual"
      : recognizedProduct?.categorySource === "inferred"
        ? "inferred"
        : recognizedProduct?.category
          ? "image_recognition"
          : "ai_fallback",
    priceSource: hasManualPrice(rawProduct.price)
      ? "manual"
      : typeof recognizedProduct?.price === "number"
        ? "image_recognition"
        : "ai_fallback"
  };
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
    priceDisplay: parseOptionalString(value.priceDisplay),
    priceCurrency: parseOptionalString(value.priceCurrency),
    priceSource: parseOptionalString(value.priceSource) as ProductInput["priceSource"],
    priceCandidates: Array.isArray(value.priceCandidates)
      ? value.priceCandidates as ProductInput["priceCandidates"]
      : undefined,
    weeklySales: parseOptionalNumber(value.weeklySales),
    monthlySales: parseOptionalNumber(value.monthlySales),
    rating: parseOptionalNumber(value.rating),
    reviewsText: parseOptionalString(value.reviewsText),
    rawRecognizedTitle: parseOptionalString(value.rawRecognizedTitle),
    cleanedProductName: parseOptionalString(value.cleanedProductName),
    productSpecs: parseProductSpecs(value.productSpecs),
    imageUrl: parseOptionalString(value.imageUrl),
    imageFileName: parseOptionalString(value.imageFileName),
    imageBase64: parseOptionalString(value.imageBase64),
    imageMimeType: parseOptionalString(value.imageMimeType),
    images: parseImageInputs(value.images)
  };
}

function mergeRecognizedProduct(
  rawProduct: Record<string, unknown>,
  recognizedProduct: RecognizedProductFields | null
): Record<string, unknown> {
  const title = parseOptionalString(rawProduct.title)
    || recognizedProduct?.cleanedProductName
    || recognizedProduct?.rawRecognizedTitle
    || recognizedProduct?.title;
  const manualCategory = parseOptionalString(rawProduct.category);
  const inferredCategory = recognizedProduct?.inferredCategory
    ?? inferCategoryFromProductInfo({
      title,
      recognizedTitle: recognizedProduct?.rawRecognizedTitle ?? recognizedProduct?.title
    });
  const category = manualCategory || recognizedProduct?.category || inferredCategory;
  const categorySource = manualCategory
    ? "manual"
    : recognizedProduct?.categorySource ?? (recognizedProduct?.category ? "recognized" : inferredCategory ? "inferred" : "unknown");

  return {
    ...recognizedProduct,
    ...rawProduct,
    title,
    category,
    inferredCategory,
    categorySource,
    rawRecognizedTitle: recognizedProduct?.rawRecognizedTitle,
    cleanedProductName: recognizedProduct?.cleanedProductName,
    price: parsePositiveNumber(rawProduct.price) ?? recognizedProduct?.price,
    priceDisplay: parseOptionalString(rawProduct.priceDisplay)
      || (hasManualPrice(rawProduct.price) ? undefined : recognizedProduct?.priceDisplay),
    priceCurrency: parseOptionalString(rawProduct.priceCurrency)
      || (hasManualPrice(rawProduct.price) ? undefined : recognizedProduct?.priceCurrency),
    priceSource: hasManualPrice(rawProduct.price) ? undefined : recognizedProduct?.priceSource,
    priceCandidates: recognizedProduct?.priceCandidates,
    weeklySales: parseOptionalNumber(rawProduct.weeklySales) ?? recognizedProduct?.weeklySales,
    monthlySales: parseOptionalNumber(rawProduct.monthlySales) ?? recognizedProduct?.monthlySales,
    rating: parseOptionalNumber(rawProduct.rating) ?? recognizedProduct?.rating,
    reviewsText: parseOptionalString(rawProduct.reviewsText) || recognizedProduct?.reviewsText,
    productSpecs: mergeProductSpecs(parseProductSpecs(rawProduct.productSpecs), recognizedProduct),
    imageUrl: parseOptionalString(rawProduct.imageUrl),
    imageFileName: parseOptionalString(rawProduct.imageFileName),
    imageBase64: parseOptionalString(rawProduct.imageBase64),
    imageMimeType: parseOptionalString(rawProduct.imageMimeType),
    images: parseImageInputs(rawProduct.images)
  };
}

function jsonResponse(body: AnalyzeProductResponse, status: number) {
  return NextResponse.json(body, { status });
}

function toRecognizedFieldsSummary(
  recognizedProduct: RecognizedProductFields | null
): RecognizedProductFields | undefined {
  if (!recognizedProduct) {
    return undefined;
  }

  const missingFields = recognizedProduct.missingFields ?? [];
  const warnings = [...(recognizedProduct.warnings ?? [])];

  if (recognizedProduct.confidence === "low") {
    warnings.push("截图识别置信度较低，建议人工核对。");
  }

  if (missingFields.length > 0) {
    warnings.push("未从图片中识别到完整商品信息，系统已将这些图片作为产品参考素材使用。请补充商品标题、类目、价格等基础信息后继续生成报告。");
  }

  return {
    title: recognizedProduct.title,
    rawRecognizedTitle: recognizedProduct.rawRecognizedTitle,
    rawRecognizedDescription: recognizedProduct.rawRecognizedDescription,
    cleanedProductName: recognizedProduct.cleanedProductName,
    category: recognizedProduct.category,
    inferredCategory: recognizedProduct.inferredCategory,
    categorySource: recognizedProduct.categorySource,
    price: recognizedProduct.price,
    priceDisplay: recognizedProduct.priceDisplay,
    priceCurrency: recognizedProduct.priceCurrency,
    priceSource: recognizedProduct.priceSource,
    priceCandidates: recognizedProduct.priceCandidates,
    weeklySales: recognizedProduct.weeklySales,
    monthlySales: recognizedProduct.monthlySales,
    rating: recognizedProduct.rating,
    reviewCount: recognizedProduct.reviewCount,
    reviewsText: recognizedProduct.reviewsText,
    confidence: recognizedProduct.confidence ?? "unknown",
    missingFields,
    warnings,
    imageCount: recognizedProduct.imageCount,
    recognizedSpecInfo: recognizedProduct.recognizedSpecInfo,
    recognizedSizeInfo: recognizedProduct.recognizedSizeInfo,
    recognizedColorStyleInfo: recognizedProduct.recognizedColorStyleInfo,
    recognizedWeightDimensionInfo: recognizedProduct.recognizedWeightDimensionInfo
  };
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  const startedAt = Date.now();
  let body: AnalyzeProductRequest | null = null;

  try {
    body = (await request.json()) as AnalyzeProductRequest;
  } catch {
    console.warn("[ANALYZE_REQUEST_INVALID_JSON]", { requestId });
    return jsonResponse({ ok: false, error: "请求体必须是合法 JSON。" }, 400);
  }

  const rawProduct = isRecord(body) && isRecord(body.product) ? body.product : null;

  if (!rawProduct) {
    console.warn("[ANALYZE_REQUEST_MISSING_PRODUCT]", { requestId });
    return jsonResponse({ ok: false, error: "请求体缺少 product。" }, 400);
  }

  const imageInputs = parseImageInputs(rawProduct.images);
  const imageBase64 = parseOptionalString(rawProduct.imageBase64);
  const legacyImageInput = imageBase64
    ? [{
        imageBase64,
        imageMimeType: parseOptionalString(rawProduct.imageMimeType) || "image/png",
        imageFileName: parseOptionalString(rawProduct.imageFileName) || "product-screenshot"
      }]
    : [];
  const submittedImageInputs = imageInputs.length > 0 ? imageInputs : legacyImageInput;
  const hasSubmittedImages = imageInputs.length > 0 || Boolean(imageBase64);
  console.info("[ANALYZE_REQUEST_START]", {
    requestId,
    imageCount: submittedImageInputs.length,
    imageSizes: getImageSizeSummaries(submittedImageInputs),
    hasManualTitle: Boolean(parseOptionalString(rawProduct.title)),
    hasManualCategory: Boolean(parseOptionalString(rawProduct.category)),
    hasManualPrice: hasManualPrice(rawProduct.price),
    enteredImageRecognition: hasSubmittedImages
  });

  const rawRecognizedProduct = imageInputs.length > 0
    ? await recognizeProductFromImages(imageInputs, { requestId })
    : imageBase64
      ? await recognizeProductFromImage({
          imageBase64,
          imageMimeType: parseOptionalString(rawProduct.imageMimeType),
          imageFileName: parseOptionalString(rawProduct.imageFileName),
          requestId
        })
      : null;
  const recognizedProduct = normalizeRecognizedProduct(rawRecognizedProduct);
  console.info("[ANALYZE_RECOGNITION_RESULT]", {
    requestId,
    imageRecognitionAttempted: hasSubmittedImages,
    hasTitle: Boolean(recognizedProduct?.title),
    hasRawRecognizedTitle: Boolean(recognizedProduct?.rawRecognizedTitle),
    hasCategory: Boolean(recognizedProduct?.category),
    hasPrice: typeof recognizedProduct?.price === "number",
    missingFields: recognizedProduct?.missingFields ?? []
  });

  const mergedProduct = mergeRecognizedProduct(rawProduct, recognizedProduct);
  const product = parseProduct(mergedProduct);
  const finalSources = getFinalProductSources(rawProduct, recognizedProduct);
  console.info("[ANALYZE_MERGED_PRODUCT]", {
    requestId,
    productNameSource: finalSources.productNameSource,
    categorySource: finalSources.categorySource,
    priceSource: finalSources.priceSource,
    hasFinalProductName: Boolean(parseOptionalString(mergedProduct.title)),
    hasFinalCategory: Boolean(parseOptionalString(mergedProduct.category)),
    hasFinalPrice: typeof parsePositiveNumber(mergedProduct.price) === "number"
  });

  if (!product) {
    const missingFields = getMissingProductFields(mergedProduct);
    const error = buildMissingProductMessage(missingFields, hasSubmittedImages);
    console.warn("[ANALYZE_REQUEST_BLOCKED]", {
      requestId,
      missingFields,
      durationMs: Date.now() - startedAt
    });

    return jsonResponse({ ok: false, error, recognizedFields: toRecognizedFieldsSummary(recognizedProduct) }, 400);
  }

  try {
    const analysisProduct: ProductInput = {
      title: product.title,
      category: product.category,
      price: product.price,
      priceDisplay: product.priceDisplay,
      priceCurrency: product.priceCurrency,
      priceSource: product.priceSource,
      priceCandidates: product.priceCandidates,
      weeklySales: product.weeklySales,
      monthlySales: product.monthlySales,
      rating: product.rating,
      reviewsText: product.reviewsText,
      rawRecognizedTitle: product.rawRecognizedTitle,
      cleanedProductName: product.cleanedProductName,
      productSpecs: product.productSpecs,
      imageUrl: product.imageUrl,
      imageFileName: product.imageFileName
    };
    const result = await analyzeHotProductWithAI(analysisProduct);
    const imageMessage = hasSubmittedImages ? "已接收上传图片，并作为产品参考素材参与分析。图片识别结果仅作辅助，报告优先使用手动填写的信息。" : "";
    const message = [result.message, imageMessage].filter(Boolean).join(" ");
    console.info("[ANALYZE_REQUEST_DONE]", {
      requestId,
      source: result.source,
      imageCount: submittedImageInputs.length,
      productNameSource: finalSources.productNameSource,
      categorySource: finalSources.categorySource,
      priceSource: finalSources.priceSource,
      durationMs: Date.now() - startedAt
    });

    return jsonResponse(
      {
        ok: true,
        data: result.report,
        source: result.source,
        message,
        recognizedFields: toRecognizedFieldsSummary(recognizedProduct)
      },
      200
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "分析失败，请稍后重试。";
    console.warn("[ANALYZE_REQUEST_FAILED]", {
      requestId,
      message,
      durationMs: Date.now() - startedAt
    });

    return jsonResponse({ ok: false, error: message }, 400);
  }
}
