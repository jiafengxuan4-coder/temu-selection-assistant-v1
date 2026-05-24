import { getAIProvider, getAIProviderConfig } from "@/lib/ai/providers";
import type { AIChatMessage } from "@/lib/ai/providers";
import type {
  ProductImageInput,
  ProductPriceCandidate,
  ProductPriceSource,
  RecognizedProductFields
} from "@/types/product";

type RecognizeProductFromImageInput = {
  imageBase64: string;
  imageMimeType?: string;
  imageFileName?: string;
};

function cleanJsonText(rawText: string): string {
  const withoutFence = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const firstBrace = withoutFence.indexOf("{");
  const lastBrace = withoutFence.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("未找到 JSON 对象。");
  }

  return withoutFence.slice(firstBrace, lastBrace + 1);
}

function pickString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().replace(/^[\s:：，、。-]+|[\s:：，、。-]+$/g, "");
  return normalized.length > 0 && normalized.toLowerCase() !== "null" ? normalized : undefined;
}

function parseLooseNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const normalized = value.replace(/,/g, "").trim();
    const match = normalized.match(/(\d+(?:\.\d+)?)/);
    const parsedValue = match ? Number(match[1]) : Number.NaN;
    return Number.isFinite(parsedValue) ? parsedValue : undefined;
  }

  return undefined;
}

function parsePrice(value: unknown): number | undefined {
  const parsedValue = parseLooseNumber(value);
  return typeof parsedValue === "number" && parsedValue >= 0 ? parsedValue : undefined;
}

function normalizeCurrency(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  const allowedCurrencies = new Set([
    "USD",
    "EUR",
    "CNY",
    "GBP",
    "CAD",
    "AUD",
    "JPY",
    "KRW",
    "UNKNOWN"
  ]);

  return allowedCurrencies.has(normalized) ? normalized : undefined;
}

function inferCurrencyFromText(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();

  if (normalized.includes("US$")) return "USD";
  if (normalized.includes("CA$")) return "CAD";
  if (normalized.includes("AU$")) return "AUD";
  if (normalized.includes("€")) return "EUR";
  if (normalized.includes("£")) return "GBP";
  if (normalized.includes("￥") || normalized.includes("¥")) return "CNY";
  if (normalized.includes("₩")) return "KRW";
  if (normalized.includes("$")) return "USD";

  return undefined;
}

function getCurrencyPrefix(currency: string | undefined): string | undefined {
  switch (currency) {
    case "USD":
      return "$";
    case "EUR":
      return "€";
    case "CNY":
      return "￥";
    case "GBP":
      return "£";
    case "CAD":
      return "CA$";
    case "AUD":
      return "AU$";
    case "JPY":
      return "¥";
    case "KRW":
      return "₩";
    default:
      return undefined;
  }
}

function normalizePriceSource(value: unknown): ProductPriceCandidate["source"] | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  const allowedSources = new Set([
    "current_sale_price",
    "discount_price",
    "original_price",
    "coupon_price",
    "other",
    "uncertain"
  ]);

  return allowedSources.has(normalized) ? normalized as ProductPriceCandidate["source"] : undefined;
}

function normalizeMainPriceSource(value: unknown): ProductPriceSource | undefined {
  const source = normalizePriceSource(value);
  return source && source !== "other" ? source : undefined;
}

function parsePriceCandidates(value: unknown): ProductPriceCandidate[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => {
      const display = pickString(item.display);
      const parsedValue = parsePrice(item.value) ?? parsePrice(display);

      if (typeof parsedValue !== "number") {
        return null;
      }

      const currency = normalizeCurrency(item.currency) ?? inferCurrencyFromText(display);
      const prefix = getCurrencyPrefix(currency);

      return {
        value: parsedValue,
        display: display ?? `${prefix ?? ""}${parsedValue}`,
        currency,
        source: normalizePriceSource(item.source),
        reason: pickString(item.reason)
      };
    })
    .filter((item): item is ProductPriceCandidate => item !== null);
}

function choosePrimaryPriceCandidate(candidates: ProductPriceCandidate[]): ProductPriceCandidate | undefined {
  const priority: Array<ProductPriceCandidate["source"]> = [
    "current_sale_price",
    "discount_price",
    "coupon_price",
    "uncertain",
    "other",
    "original_price"
  ];

  return priority
    .map((source) => candidates.find((candidate) => candidate.source === source))
    .find((candidate): candidate is ProductPriceCandidate => Boolean(candidate))
    ?? candidates[0];
}

function parsePriceInfo(
  priceValue: unknown,
  priceDisplayValue: unknown,
  priceCurrencyValue: unknown,
  priceSourceValue: unknown,
  priceCandidatesValue: unknown
): Pick<RecognizedProductFields, "price" | "priceDisplay" | "priceCurrency" | "priceSource" | "priceCandidates"> {
  const priceCandidates = parsePriceCandidates(priceCandidatesValue);
  const primaryCandidate = choosePrimaryPriceCandidate(priceCandidates);
  const priceDisplay = pickString(priceDisplayValue);
  const priceSourceText = priceDisplay ?? (typeof priceValue === "string" ? priceValue.trim() : undefined);
  const price = primaryCandidate?.value ?? parsePrice(priceValue) ?? parsePrice(priceDisplay);
  const priceCurrency = normalizeCurrency(priceCurrencyValue)
    ?? primaryCandidate?.currency
    ?? inferCurrencyFromText(priceSourceText)
    ?? (typeof price === "number" ? "UNKNOWN" : undefined);
  const prefix = getCurrencyPrefix(priceCurrency);
  const generatedDisplay = typeof price === "number" ? `${prefix ?? ""}${price}` : undefined;
  const priceSource = normalizeMainPriceSource(primaryCandidate?.source) ?? normalizeMainPriceSource(priceSourceValue);

  return {
    price,
    priceDisplay: primaryCandidate?.display ?? priceDisplay ?? priceSourceText ?? generatedDisplay,
    priceCurrency,
    priceSource,
    priceCandidates
  };
}

function parseSalesCount(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value
    .toLowerCase()
    .replace(/,/g, "")
    .replace(/\+/g, "")
    .replace(/sold|已售|销量|件|单/g, "")
    .trim();
  const match = normalized.match(/(\d+(?:\.\d+)?)/);

  if (!match) {
    return undefined;
  }

  const baseValue = Number(match[1]);

  if (!Number.isFinite(baseValue)) {
    return undefined;
  }

  if (normalized.includes("万")) {
    return Math.round(baseValue * 10000);
  }

  if (normalized.includes("k")) {
    return Math.round(baseValue * 1000);
  }

  return Math.round(baseValue);
}

function parseRating(value: unknown): number | undefined {
  const parsedValue = parseLooseNumber(value);
  return typeof parsedValue === "number" && parsedValue >= 0 && parsedValue <= 5
    ? parsedValue
    : undefined;
}

function pickStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .map(pickString)
        .filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];
}

function createMissingFields(result: RecognizedProductFields): string[] {
  const missingFields: string[] = [];

  if (!result.title) missingFields.push("title");
  if (!result.category) missingFields.push("category");
  if (typeof result.price !== "number") missingFields.push("price");
  if (typeof result.weeklySales !== "number" && typeof result.monthlySales !== "number") {
    missingFields.push("sales");
  }
  if (typeof result.rating !== "number") missingFields.push("rating");
  if (!result.reviewsText) missingFields.push("reviewsText");

  return missingFields;
}

function createWarnings(result: RecognizedProductFields, rawWarnings: string[]): string[] {
  const warnings = [...rawWarnings];

  if (!result.title) warnings.push("未识别到商品标题");
  if (typeof result.price !== "number") warnings.push("未识别到商品价格");
  if (typeof result.weeklySales !== "number" && typeof result.monthlySales !== "number") {
    warnings.push("未识别到销量信息");
  }
  if (typeof result.rating !== "number") warnings.push("未识别到商品评分");
  if (!result.reviewsText) warnings.push("未识别到评论内容");

  if (!result.title || typeof result.price !== "number" || typeof result.rating !== "number") {
    warnings.push("截图可能不完整，建议上传包含标题、价格、销量和评分的完整商品截图");
  }

  if (result.priceCandidates && result.priceCandidates.length > 1) {
    warnings.push("截图中存在多个价格，系统已优先选择当前售价，建议人工核对。");
  }

  if (
    result.priceSource === "original_price"
    || (result.priceCandidates?.length === 1 && result.priceCandidates[0]?.source === "original_price")
  ) {
    warnings.push("仅识别到原价或划线价，建议人工核对当前售价。");
  }

  if (result.priceSource === "uncertain") {
    warnings.push("截图中存在多个价格，建议人工核对。");
  }

  return [...new Set(warnings)];
}

function calculateConfidence(result: RecognizedProductFields): RecognizedProductFields["confidence"] {
  const hasTitle = Boolean(result.title);
  const hasCategory = Boolean(result.category);
  const hasPrice = typeof result.price === "number";
  const hasSales = typeof result.weeklySales === "number" || typeof result.monthlySales === "number";
  const hasRating = typeof result.rating === "number";

  if (hasTitle && hasPrice && hasRating && hasSales) {
    return "high";
  }

  if (hasTitle && hasPrice) {
    return "medium";
  }

  if (hasTitle || hasCategory) {
    return "low";
  }

  return "unknown";
}

function parseRecognizedFields(rawText: string, imageCount: number): RecognizedProductFields {
  const parsed = JSON.parse(cleanJsonText(rawText)) as Record<string, unknown>;
  const priceInfo = parsePriceInfo(
    parsed.price,
    parsed.priceDisplay,
    parsed.priceCurrency,
    parsed.priceSource,
    parsed.priceCandidates
  );
  const result: RecognizedProductFields = {
    title: pickString(parsed.title),
    category: pickString(parsed.category),
    price: priceInfo.price,
    priceDisplay: priceInfo.priceDisplay,
    priceCurrency: priceInfo.priceCurrency,
    priceSource: priceInfo.priceSource,
    priceCandidates: priceInfo.priceCandidates,
    weeklySales: parseSalesCount(parsed.weeklySales),
    monthlySales: parseSalesCount(parsed.monthlySales),
    rating: parseRating(parsed.rating),
    reviewCount: parseSalesCount(parsed.reviewCount),
    reviewsText: pickString(parsed.reviewsText),
    imageCount,
    rawText: pickString(parsed.rawText) ?? rawText
  };

  return {
    ...result,
    confidence: calculateConfidence(result),
    missingFields: createMissingFields(result),
    warnings: createWarnings(result, pickStringArray(parsed.warnings))
  };
}

function fallbackRecognition(rawText = "", imageCount?: number): RecognizedProductFields {
  return {
    confidence: "unknown",
    missingFields: ["title", "category", "price"],
    warnings: ["截图识别失败，建议手动填写商品信息后重新生成报告。"],
    imageCount,
    rawText
  };
}

function buildRecognitionPrompt(imageCount: number): string {
  return `请综合识别这 ${imageCount} 张 TEMU 商品截图里的商品信息。这些图片来自同一个商品，不同截图可能包含标题、价格、销量、评分、评论、详情页卖点或规格变体。请合并识别结果，最终只返回一份 JSON，不要 markdown，不要解释，不要代码块。
返回格式：
{
  "title": null,
  "category": null,
  "price": null,
  "priceDisplay": null,
  "priceCurrency": null,
  "priceSource": null,
  "priceCandidates": [],
  "weeklySales": null,
  "monthlySales": null,
  "rating": null,
  "reviewCount": null,
  "reviewsText": null,
  "confidence": "low",
  "missingFields": [],
  "warnings": [],
  "rawText": ""
}

规则：
1. 只提取截图中真实出现的信息，不要编造。
2. title 识别商品标题或最接近的商品名称。
3. price 只提取商品售价，返回数字。
4. priceDisplay 必须保留截图中的原始价格和币种符号，例如 €9.79、$9.79、US$9.79、￥69、£8.99、CA$12.99、AU$15.99。
5. priceCurrency 返回 USD / EUR / CNY / GBP / CAD / AUD / JPY / KRW / UNKNOWN / null。
6. priceSource 返回 current_sale_price / discount_price / original_price / coupon_price / uncertain / null。
7. priceCandidates 返回识别到的所有价格候选，每个候选包含 value、display、currency、source、reason。
8. 如果截图中出现“最后1天”“限时”“sale”“deal”“discount”“优惠”“到手价”“券后价”等附近的价格，应优先作为当前售价。
9. 如果价格被划线、灰色、旁边有“原价”“list price”“was”“before”等，不要作为主 price，只能作为 original_price candidate。
10. 如果有多个价格，主 price 必须选择最像当前成交价的价格。
11. 不要把销量、评分、评论数、店铺数据、利润、库存、折扣百分比当作商品价格。
12. 如果无法确定哪个是当前售价，priceSource 返回 uncertain，并在 warnings 中提示“截图中存在多个价格，建议人工核对”。
13. 如果截图中清晰显示“最后1天 $2.97”，应返回 price: 2.97、priceDisplay: "$2.97"、priceCurrency: "USD"、priceSource: "current_sale_price"。
14. weeklySales 和 monthlySales 要区分周期。
15. 如果截图只出现 sold / 已售 / 销量，但无法判断是周销量还是月销量，优先放入 monthlySales，并在 rawText 说明周期不确定。
16. rating 返回 0-5 的数字。
17. reviewCount 返回评论数量，如果看不到则为 null。
18. reviewsText 通常为空，除非截图中真的有评论内容。
19. category 如果截图没有明确类目，可以根据商品外观粗略判断，但 confidence 不得为 high。
20. missingFields 写出没识别到的字段。
21. 识别不到的字段必须返回 null，不要猜销量、评分、评论。
22. 如果图片模糊、裁剪严重、关键信息缺失，请在 warnings 中用中文说明。
23. 多张截图来自同一个商品，请综合识别，不要逐张重复输出。
24. 如果不同截图字段冲突，以更清晰、更完整、更像商品详情页主信息的字段为准。
25. 如果多张截图信息可能不一致，在 warnings 中加入“多张截图信息可能存在不一致，建议人工核对”。
26. 如果某张图无法识别，不影响其他图片的信息提取。`;
}

export async function recognizeProductFromImage({
  imageBase64,
  imageMimeType,
  imageFileName
}: RecognizeProductFromImageInput): Promise<RecognizedProductFields> {
  return recognizeProductFromImages([
    {
      imageBase64,
      imageMimeType: imageMimeType || "image/png",
      imageFileName: imageFileName || "product-screenshot"
    }
  ]);
}

export async function recognizeProductFromImages(
  images: ProductImageInput[]
): Promise<RecognizedProductFields> {
  const limitedImages = images.slice(0, 5);

  if (limitedImages.length === 0) {
    return fallbackRecognition("未提供商品截图", 0);
  }

  try {
    const config = getAIProviderConfig();
    const provider = getAIProvider(config.provider);
    const visionConfig = {
      ...config,
      model: process.env.AI_VISION_MODEL || "qwen-vl-plus"
    };
    const content: AIChatMessage["content"] = [
      {
        type: "text",
        text: buildRecognitionPrompt(limitedImages.length)
      },
      ...limitedImages.map((image) => ({
        type: "image_url" as const,
        image_url: {
          url: image.imageBase64
        }
      }))
    ];
    const messages: AIChatMessage[] = [
      {
        role: "system",
        content:
          "你是 TEMU 商品截图识别助手。你的任务是从同一个商品的 1-5 张截图中提取结构化商品信息。只做识别，不做选品判断，不做利润判断，不要编造截图中没有的信息。"
      },
      {
        role: "user",
        content
      }
    ];
    const response = await provider.chatCompletion(messages, visionConfig);

    return parseRecognizedFields(response.text, limitedImages.length);
  } catch (error) {
    const message = error instanceof Error ? error.message : "截图识别失败";
    console.warn("[IMAGE_RECOGNITION_FALLBACK]", {
      errorType: "image_recognition",
      message
    });

    return fallbackRecognition(message, limitedImages.length);
  }
}
