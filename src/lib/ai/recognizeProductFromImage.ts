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
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function pickNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsedValue = Number(value.replace(/[^0-9.]/g, ""));
    return Number.isFinite(parsedValue) ? parsedValue : undefined;
  }

  return undefined;
}

function pickStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function pickConfidence(value: unknown): RecognizedProductFields["confidence"] {
  return value === "high" || value === "medium" || value === "low" ? value : "low";
}

function parseRecognizedFields(rawText: string): RecognizedProductFields {
  const parsed = JSON.parse(cleanJsonText(rawText)) as Record<string, unknown>;

  return {
    title: pickString(parsed.title),
    category: pickString(parsed.category),
    price: pickNumber(parsed.price),
    weeklySales: pickNumber(parsed.weeklySales),
    monthlySales: pickNumber(parsed.monthlySales),
    rating: pickNumber(parsed.rating),
    reviewCount: pickNumber(parsed.reviewCount),
    reviewsText: pickString(parsed.reviewsText),
    confidence: pickConfidence(parsed.confidence),
    missingFields: pickStringArray(parsed.missingFields),
    rawText: pickString(parsed.rawText) ?? rawText
  };
}

function fallbackRecognition(rawText = ""): RecognizedProductFields {
  return {
    confidence: "low",
    missingFields: ["title", "category", "price"],
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
            text: `请识别这张 TEMU 商品截图里的商品信息，只返回 JSON，不要 markdown，不要解释。
返回格式：
{
  "title": "",
  "category": "",
  "price": null,
  "weeklySales": null,
  "monthlySales": null,
  "rating": null,
  "reviewCount": null,
  "reviewsText": "",
  "confidence": "low",
  "missingFields": [],
  "rawText": ""
}

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
10. missingFields 写出没识别到的字段。`
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
