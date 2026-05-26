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

function cleanProductName(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const cleaned = value
    .replace(/\b(TEMU|Amazon|AliExpress|1688)\b/gi, "")
    .replace(/^[A-Z0-9][A-Z0-9-]{2,}\s+/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s:：，、。-]+|[\s:：，、。-]+$/g, "");

  return cleaned.length > 0 ? cleaned : value;
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
    "final_price",
    "estimated_price",
    "coupon_price",
    "discount_price",
    "current_sale_price",
    "previous_price",
    "original_price",
    "strikethrough_price",
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

  const candidates: ProductPriceCandidate[] = [];

  for (const item of value) {
    if (typeof item !== "object" || item === null) {
      continue;
    }

    const record = item as Record<string, unknown>;
    const display = pickString(record.display);
    const parsedValue = parsePrice(record.value) ?? parsePrice(display);

    if (typeof parsedValue !== "number") {
      continue;
    }

    const currency = normalizeCurrency(record.currency) ?? inferCurrencyFromText(display);
    const prefix = getCurrencyPrefix(currency);
    const candidate: ProductPriceCandidate = {
      value: parsedValue,
      display: display ?? `${prefix ?? ""}${parsedValue}`
    };
    const source = normalizePriceSource(record.source);
    const reason = pickString(record.reason);

    if (currency) {
      candidate.currency = currency;
    }

    if (source) {
      candidate.source = source;
    }

    if (reason) {
      candidate.reason = reason;
    }

    candidates.push(candidate);
  }

  return candidates;
}

function choosePrimaryPriceCandidate(candidates: ProductPriceCandidate[]): ProductPriceCandidate | undefined {
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
    warnings.push("截图中存在多个价格，系统已优先采用预估价/到手价，建议人工核对。");
  }

  if (
    result.priceSource === "original_price"
    || result.priceSource === "strikethrough_price"
    || (result.priceCandidates?.length === 1
      && ["original_price", "strikethrough_price"].includes(result.priceCandidates[0]?.source ?? ""))
  ) {
    warnings.push("仅识别到原价或划线价，建议人工核对当前到手价。");
  }

  if (result.priceSource === "uncertain") {
    warnings.push("截图中存在多个价格，建议人工核对当前到手价。");
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
    rawRecognizedTitle: pickString(parsed.rawRecognizedTitle) ?? pickString(parsed.title),
    rawRecognizedDescription: pickString(parsed.rawRecognizedDescription),
    cleanedProductName: pickString(parsed.cleanedProductName)
      ?? cleanProductName(pickString(parsed.rawRecognizedTitle) ?? pickString(parsed.title)),
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
    recognizedSpecInfo: pickString(parsed.recognizedSpecInfo),
    recognizedSizeInfo: pickString(parsed.recognizedSizeInfo),
    recognizedColorStyleInfo: pickString(parsed.recognizedColorStyleInfo),
    recognizedWeightDimensionInfo: pickString(parsed.recognizedWeightDimensionInfo),
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
    warnings: ["未从图片中识别到完整商品信息，系统已将这些图片作为产品参考素材使用。请补充商品标题、类目、价格等基础信息后继续生成报告。"],
    imageCount,
    rawText
  };
}

function buildRecognitionPrompt(imageCount: number): string {
  return `请综合识别这 ${imageCount} 张 TEMU 商品截图里的商品信息。这些图片来自同一个商品，不同截图可能包含标题、价格、销量、评分、评论、详情页卖点或规格变体。请合并识别结果，最终只返回一份 JSON，不要 markdown，不要解释，不要代码块。
返回格式：
{
  "title": null,
  "rawRecognizedTitle": null,
  "rawRecognizedDescription": null,
  "cleanedProductName": null,
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
  "recognizedSpecInfo": null,
  "recognizedSizeInfo": null,
  "recognizedColorStyleInfo": null,
  "recognizedWeightDimensionInfo": null,
  "rawText": ""
}

规则：
1. 只提取截图中真实出现的信息，不要编造。
2. title 尽量保留图片/截图中识别到的完整商品标题，不要过度压缩或概括。
3. rawRecognizedTitle 保留图片中看到的完整原始标题；如果多张图有相关标题或描述，请尽量合并为完整原始识别标题。
4. rawRecognizedDescription 保留图片中识别到的相关产品描述、卖点或长描述。
5. cleanedProductName 输出清洗后的通用产品名称，去掉品牌词、平台词和无关修饰词，保留产品通用名称，例如“狗背带和牵引绳套装”。
6. 重点识别这些区域：商品标题区域、价格区域、销量/评分/评论区域、颜色选项区域、尺码选项区域、SKU/变体按钮区域、规格表/尺码表/参数表区域、图片中被红框/箭头/标注强调的区域。
7. 即使颜色/尺码文字较小，也要尝试从 SKU 选项按钮、颜色按钮、尺码按钮、变体卡片中读取。
8. 如果整页截图信息较多，应特别关注红框、箭头、标注区域，因为这些区域通常是用户希望重点识别的内容。
9. 如果图片中出现颜色选项、颜色按钮、SKU 颜色卡片，请尽量提取所有可见选项，输出到 recognizedColorStyleInfo。
10. 如果有当前选中颜色，请写成：当前选中颜色：xxx；全部可选颜色：黑色、紫色、蓝色、红色、玫红色。
11. 如果图片中出现尺码按钮、尺码选项、SKU 尺码区域，请尽量提取所有可见尺码，输出到 recognizedSizeInfo。
12. 如果有当前选中尺码，请写成：当前选中尺码：xxx；全部可选尺码：S、M、L、XL。
13. 如果图片中出现规格表、尺码表、参数表，请尽量结构化识别，不要只写“未识别”。优先提取尺码、颜色、长度、宽度、高度、重量、包装尺寸、适用对象、配件数量。
14. price 只提取商品售价，返回数字。
15. priceDisplay 必须保留截图中的原始价格和币种符号，例如 €9.79、$9.79、US$9.79、￥69、£8.99、CA$12.99、AU$15.99。
16. priceCurrency 返回 USD / EUR / CNY / GBP / CAD / AUD / JPY / KRW / UNKNOWN / null。
17. priceSource 返回 final_price / estimated_price / coupon_price / discount_price / current_sale_price / previous_price / original_price / strikethrough_price / uncertain / null。
18. priceCandidates 返回识别到的所有价格候选，每个候选包含 value、display、currency、source、reason。
8. TEMU 页面中，如果价格前有“预估”“预计”“到手”“券后”“折后”“限时”“最后”“sale”“deal”等词，应优先作为主价格。
9. 如果价格前有“预估”，这个价格通常是当前用户最应该参考的成交价，应优先于原价和前价，priceSource 使用 estimated_price。
10. 如果价格被划线，或旁边显示“原价”“前价”“list price”“was”“before”等，不要作为主 price。
11. 如果同时出现 $7.30、预估 $2.97、前价 $3.30，主价格必须选择 $2.97。
12. $7.30 应作为 strikethrough_price 或 original_price candidate；$3.30 应作为 previous_price candidate。
13. 不要把原价、前价、划线价错误标记为 current_sale_price。
14. 如果截图中有橙色/红色的“预估价”，优先选择该价格。
15. 不要把销量、评分、评论数、店铺数据、利润、库存、折扣百分比当作商品价格。
16. 如果无法确定哪个是当前售价，priceSource 返回 uncertain，并在 warnings 中提示“截图中存在多个价格，建议人工核对当前到手价”。
17. 如果截图中清晰显示“预估 $2.97”，应返回 price: 2.97、priceDisplay: "$2.97"、priceCurrency: "USD"、priceSource: "estimated_price"。
14. weeklySales 和 monthlySales 要区分周期。
15. 如果截图只出现 sold / 已售 / 销量，但无法判断是周销量还是月销量，优先放入 monthlySales，并在 rawText 说明周期不确定。
16. rating 返回 0-5 的数字。
17. reviewCount 返回评论数量，如果看不到则为 null。
18. reviewsText 通常为空，除非截图中真的有评论内容。
19. category 如果截图没有明确类目，可以根据商品外观粗略判断，但 confidence 不得为 high。
20. 如果上传图片里包含规格表、尺码表、参数表，请尽量识别为结构化信息：recognizedSpecInfo、recognizedSizeInfo、recognizedColorStyleInfo、recognizedWeightDimensionInfo。
21. 如果没有识别到规格、尺码、颜色款式、重量尺寸信息，对应字段返回 null，不要编造。
22. missingFields 写出没识别到的字段。
23. 识别不到的字段必须返回 null，不要猜销量、评分、评论。
24. 如果图片模糊、裁剪严重、关键信息缺失，请在 warnings 中用中文说明。
25. 多张截图来自同一个商品，请综合识别，不要逐张重复输出。
26. 如果不同截图字段冲突，以更清晰、更完整、更像商品详情页主信息的字段为准。
27. 如果多张截图信息可能不一致，在 warnings 中加入“多张截图信息可能存在不一致，建议人工核对”。
28. 如果某张图无法识别，不影响其他图片的信息提取。`;
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
  const limitedImages = images.slice(0, 10);

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
          "你是 TEMU 商品图片参考识别助手。用户上传的可能是 TEMU 截图、产品素材图、配件图或 1688 图。你的任务是从同一个商品的 1-10 张图片中尽量提取结构化商品信息；如果提取不到标题、类目、价格等字段，不要视为严重错误，这些图片仍可作为产品结构和图文生成参考素材。只做识别，不做选品判断，不做利润判断，不要编造图片中没有的信息。"
      },
      {
        role: "user",
        content
      }
    ];
    const response = await provider.chatCompletion(messages, visionConfig);

    return parseRecognizedFields(response.text, limitedImages.length);
  } catch (error) {
    const message = error instanceof Error ? error.message : "图片识别未得到完整商品信息";
    console.warn("[IMAGE_RECOGNITION_FALLBACK]", {
      errorType: "image_recognition",
      message
    });

    return fallbackRecognition(message, limitedImages.length);
  }
}
