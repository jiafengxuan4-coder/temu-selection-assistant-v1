import { getAIProvider, getAIProviderConfig } from "@/lib/ai/providers";
import type { RecognizedProductFields } from "@/types/product";
import type { AIChatMessage } from "@/lib/ai/providers";

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

  const normalized = value.trim().replace(/^[\s:：,，。.-]+|[\s:：,，。.-]+$/g, "");
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

function parsePriceInfo(
  priceValue: unknown,
  priceDisplayValue: unknown,
  priceCurrencyValue: unknown
): Pick<RecognizedProductFields, "price" | "priceDisplay" | "priceCurrency"> {
  const priceDisplay = pickString(priceDisplayValue);
  const priceSource = priceDisplay ?? (typeof priceValue === "string" ? priceValue.trim() : undefined);
  const price = parsePrice(priceValue) ?? parsePrice(priceDisplay);
  const priceCurrency = normalizeCurrency(priceCurrencyValue)
    ?? inferCurrencyFromText(priceSource)
    ?? (typeof price === "number" ? "UNKNOWN" : undefined);
  const prefix = getCurrencyPrefix(priceCurrency);
  const generatedDisplay = typeof price === "number" ? `${prefix ?? ""}${price}` : undefined;

  return {
    price,
    priceDisplay: priceDisplay ?? priceSource ?? generatedDisplay,
    priceCurrency
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

function parseRecognizedFields(rawText: string): RecognizedProductFields {
  const parsed = JSON.parse(cleanJsonText(rawText)) as Record<string, unknown>;
  const priceInfo = parsePriceInfo(parsed.price, parsed.priceDisplay, parsed.priceCurrency);
  const result: RecognizedProductFields = {
    title: pickString(parsed.title),
    category: pickString(parsed.category),
    price: priceInfo.price,
    priceDisplay: priceInfo.priceDisplay,
    priceCurrency: priceInfo.priceCurrency,
    weeklySales: parseSalesCount(parsed.weeklySales),
    monthlySales: parseSalesCount(parsed.monthlySales),
    rating: parseRating(parsed.rating),
    reviewCount: parseSalesCount(parsed.reviewCount),
    reviewsText: pickString(parsed.reviewsText),
    rawText: pickString(parsed.rawText) ?? rawText
  };

  return {
    ...result,
    confidence: calculateConfidence(result),
    missingFields: createMissingFields(result),
    warnings: createWarnings(result, pickStringArray(parsed.warnings))
  };
}

function fallbackRecognition(rawText = ""): RecognizedProductFields {
  return {
    confidence: "unknown",
    missingFields: ["title", "category", "price"],
    warnings: ["截图识别失败，建议手动填写商品信息后重新生成报告。"],
    rawText
  };
}

export async function recognizeProductFromImage({
  imageBase64
}: RecognizeProductFromImageInput): Promise<RecognizedProductFields> {
  try {
    const config = getAIProviderConfig();
    const provider = getAIProvider(config.provider);
    const visionConfig = {
      ...config,
      model: process.env.AI_VISION_MODEL || "qwen-vl-plus"
    };
    const messages: AIChatMessage[] = [
      {
        role: "system",
        content:
          "你是 TEMU 商品截图识别助手。你的任务是从商品截图中提取结构化商品信息。只做识别，不做选品判断，不做利润判断，不要编造截图中没有的信息。"
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `请识别这张 TEMU 商品截图里的商品信息，只返回 JSON，不要 markdown，不要解释，不要代码块。
返回格式：
{
  "title": null,
  "category": null,
  "price": null,
  "priceDisplay": null,
  "priceCurrency": null,
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

价格字段要求：
1. 如果截图中价格带币种符号，priceDisplay 必须保留原始币种符号。
2. 如果截图显示 €9.79，priceDisplay 返回 "€9.79"，priceCurrency 返回 "EUR"，price 返回 9.79。
3. 如果截图显示 $9.79，priceDisplay 返回 "$9.79"，priceCurrency 返回 "USD"，price 返回 9.79。
4. 如果截图显示 US$9.79，priceDisplay 返回 "US$9.79"，priceCurrency 返回 "USD"，price 返回 9.79。
5. 如果截图显示 ￥69 或 ¥69，priceDisplay 返回原文，priceCurrency 返回 "CNY"，price 返回 69。
6. 如果截图显示 £8.99 / CA$12.99 / AU$15.99，也要保留 priceDisplay，并分别返回 GBP / CAD / AUD。
7. 如果无法判断币种，但识别到价格数字，priceDisplay 保留截图原文，priceCurrency 返回 "UNKNOWN"。

规则：
1. 只提取截图中真实出现的信息，不要编造。
2. title 识别商品标题或最接近的商品名称。
3. price 只提取商品售价，返回数字。
4. weeklySales 和 monthlySales 要区分周期。
5. 如果截图只出现 sold / 已售 / 销量，但无法判断是周销量还是月销量，优先放入 monthlySales，并在 rawText 说明周期不确定。
6. rating 返回 0-5 的数字。
7. reviewCount 返回评论数量，如果看不到则为 null。
8. reviewsText 通常为空，除非截图中真的有评论内容。
9. category 如果截图没有明确类目，可以根据商品外观粗略判断，但 confidence 不得为 high。
10. missingFields 写出没识别到的字段。
11. 识别不到的字段必须返回 null，不要猜销量、评分、评论。
12. 如果图片模糊、裁剪严重、关键信息缺失，请在 warnings 中用中文说明。`
          },
          {
            type: "image_url",
            image_url: {
              url: imageBase64
            }
          }
        ]
      }
    ];
    const response = await provider.chatCompletion(messages, visionConfig);

    return parseRecognizedFields(response.text);
  } catch (error) {
    const message = error instanceof Error ? error.message : "截图识别失败";
    console.warn("[IMAGE_RECOGNITION_FALLBACK]", {
      errorType: "image_recognition",
      message
    });

    return fallbackRecognition(message);
  }
}
