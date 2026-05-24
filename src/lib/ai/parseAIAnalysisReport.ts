import type { AIAnalysisRawOutput } from "@/types/ai";
import type {
  ConfidenceLevel,
  HotProductFactorType,
  PriceComparisonRiskLevel
} from "@/types/analysis";
import type {
  DataCompleteness,
  ProductInput,
  ProductStructure,
  StandardizationLevel
} from "@/types/product";
import type {
  AnalysisReport,
  RecommendationDirectionType,
  RecommendationLevel
} from "@/types/recommendation";
import { validateAndPolishAIReport } from "@/lib/ai/validateAIReport";

type ParseAIAnalysisReportParams = {
  product: ProductInput;
  rawText: string;
};

const confidenceLevels = ["low", "medium", "high", "unknown"] as const;
const hotProductFactorTypes = [
  "price",
  "color",
  "style",
  "image_click_rate",
  "comprehensive",
  "unknown"
] as const;
const productStructures = ["single", "bundle", "multi_pack", "unknown"] as const;
const standardizationLevels = [
  "standard",
  "semi_standard",
  "non_standard",
  "unknown"
] as const;
const riskLevels = ["low", "medium", "high", "unknown"] as const;
const recommendationTypes = [
  "bundle",
  "upgrade",
  "scene_segment",
  "user_segment",
  "function_difference",
  "review_pain_point",
  "image_expression",
  "cautious"
] as const;
const recommendationLevels = [
  "priority_test",
  "small_batch_test",
  "cautious",
  "not_recommended"
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function cleanAIJsonText(rawText: string): string {
  const withoutFence = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const firstBrace = withoutFence.indexOf("{");
  const lastBrace = withoutFence.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("AI 返回内容中未找到 JSON 对象。");
  }

  return withoutFence.slice(firstBrace, lastBrace + 1);
}

function parseRawOutput(rawText: string): AIAnalysisRawOutput {
  try {
    const parsed = JSON.parse(cleanAIJsonText(rawText)) as unknown;

    if (!isRecord(parsed)) {
      throw new Error("AI JSON 根节点不是对象。");
    }

    return parsed as AIAnalysisRawOutput;
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知解析错误";
    throw new Error(`AI 返回内容解析失败：${message}`);
  }
}

function sanitizeText(value: string): string {
  return value
    .replace(/一定能通过核价/g, "不代表可以通过核价")
    .replace(/一定能爆/g, "不代表具备爆款结果")
    .replace(/保证能卖/g, "不承诺销售结果")
    .replace(/保证通过/g, "不承诺通过")
    .replace(/百分百/g, "高确定性")
    .replace(/必然爆/g, "可能有机会")
    .replace(/必爆/g, "可能有机会")
    .replace(/必过/g, "可能通过")
    .replace(/必然/g, "可能")
    .replace(/绝对/g, "明显")
    .replace(/保证/g, "承诺")
    .replace(/一定/g, "可能");
}

function hasEnglishHeavyText(value: string): boolean {
  const englishMatches = value.match(/[A-Za-z]{4,}/g) ?? [];
  const chineseMatches = value.match(/[\u4e00-\u9fa5]/g) ?? [];

  return englishMatches.length >= 6 && englishMatches.length > chineseMatches.length / 3;
}

function pickString(value: unknown, fallback: string): string {
  return sanitizeText(typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback);
}

function pickStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .map((item) => sanitizeText(item.trim()))
    : [];
}

function pickNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clampScore(value: unknown, fallback: number): number {
  return Math.min(100, Math.max(0, Math.round(pickNumber(value, fallback))));
}

function pickEnum<T extends readonly string[]>(
  value: unknown,
  allowedValues: T,
  fallback: T[number]
): T[number] {
  return typeof value === "string" && (allowedValues as readonly string[]).includes(value)
    ? value
    : fallback;
}

function createDataCompleteness(product: ProductInput): DataCompleteness {
  const hasImage = Boolean(product.imageFileName || product.imageUrl);
  const hasWeeklySales = typeof product.weeklySales === "number";
  const hasMonthlySales = typeof product.monthlySales === "number";
  const hasRating = typeof product.rating === "number";
  const hasReviews = Boolean(product.reviewsText?.trim());
  const missingFields: string[] = [];

  if (!hasImage) missingFields.push("爆款图片");
  if (!hasWeeklySales) missingFields.push("周销量");
  if (!hasMonthlySales) missingFields.push("月销量");
  if (!hasRating) missingFields.push("商品评分");
  if (!hasReviews) missingFields.push("评论内容");

  const optionalMissingCount = [hasWeeklySales, hasMonthlySales, hasRating, hasReviews].filter(
    (item) => !item
  ).length;

  return {
    hasImage,
    hasTitle: Boolean(product.title.trim()),
    hasCategory: Boolean(product.category.trim()),
    hasPrice: product.price > 0,
    hasWeeklySales,
    hasMonthlySales,
    hasRating,
    hasReviews,
    missingFields,
    confidenceImpact: optionalMissingCount >= 3 ? "high" : optionalMissingCount > 0 ? "medium" : "low"
  };
}

function mapImageRecognition(raw: AIAnalysisRawOutput["imageRecognition"], product: ProductInput) {
  return {
    productType: pickString(raw?.productType, product.category || "unknown"),
    category: pickString(raw?.category, product.category || "unknown"),
    mainColors: pickStringArray(raw?.mainColors),
    secondaryColors: pickStringArray(raw?.secondaryColors),
    styleDescription: pickString(raw?.styleDescription, "unknown"),
    productStructure: pickEnum(
      raw?.productStructure,
      productStructures,
      "unknown"
    ) as ProductStructure,
    standardizationLevel: pickEnum(
      raw?.standardizationLevel,
      standardizationLevels,
      "unknown"
    ) as StandardizationLevel,
    visibleAccessories: pickStringArray(raw?.visibleAccessories),
    usageScenes: pickStringArray(raw?.usageScenes),
    targetUsers: pickStringArray(raw?.targetUsers),
    imageStyle: pickString(raw?.imageStyle, "unknown"),
    clickPotentialFactors: pickStringArray(raw?.clickPotentialFactors),
    sellingPointElements: pickStringArray(raw?.sellingPointElements),
    unknownFields: pickStringArray(raw?.unknownFields),
    warnings: [
      {
        code: "AI_TEXT_ONLY_ANALYSIS",
        message: "当前接口未接入真实图片上传，本次图片识别结果主要基于商品信息生成。",
        severity: "low" as const
      }
    ],
    confidence: "medium" as ConfidenceLevel
  };
}

function mapHotProductAnalysis(raw: AIAnalysisRawOutput["hotProductAnalysis"]) {
  return {
    hotProductType: pickEnum(
      raw?.hotProductType,
      hotProductFactorTypes,
      "unknown"
    ) as HotProductFactorType,
    possibleWinningFactors: Array.isArray(raw?.possibleWinningFactors)
      ? raw.possibleWinningFactors.map((factor) => ({
          factor: pickEnum(factor?.factor, hotProductFactorTypes, "unknown") as HotProductFactorType,
          confidence: pickEnum(factor?.confidence, confidenceLevels, "unknown") as ConfidenceLevel,
          reason: pickString(factor?.reason, "当前数据不足，需要进一步验证。")
        }))
      : [],
    unknownFactors: pickStringArray(raw?.unknownFactors),
    confidence: pickEnum(raw?.confidence, confidenceLevels, "unknown") as ConfidenceLevel,
    notes: pickStringArray(raw?.notes)
  };
}

function mapDirectCopyRisk(raw: AIAnalysisRawOutput["directCopyRisk"]) {
  return {
    riskLevel: pickEnum(raw?.riskLevel, riskLevels, "unknown") as PriceComparisonRiskLevel,
    riskScore: clampScore(raw?.riskScore, 60),
    reasons: pickStringArray(raw?.reasons),
    riskWarnings: pickStringArray(raw?.riskWarnings),
    riskReductionSuggestions: pickStringArray(raw?.riskReductionSuggestions)
  };
}

function mapRecommendations(raw: AIAnalysisRawOutput["recommendations"]) {
  return (Array.isArray(raw) ? raw : []).slice(0, 3).map((recommendation, index) => {
    const salesPotentialScore = clampScore(recommendation.salesPotentialScore, 60);
    const priceApprovalScore = clampScore(recommendation.priceApprovalScore, 60);
    const finalRecommendationScore = clampScore(recommendation.finalRecommendationScore, 60);

    return {
      id: `ai-recommendation-${index + 1}`,
      type: pickEnum(
        recommendation.type,
        recommendationTypes,
        "cautious"
      ) as RecommendationDirectionType,
      title: pickString(recommendation.title, `差异化推荐方向 ${index + 1}`),
      productIdea: pickString(recommendation.productIdea, "建议补充更多商品信息后再细化方案。"),
      reason: pickString(recommendation.reason, "当前方向需要进一步验证。"),
      relatedWinningFactors: pickStringArray(recommendation.relatedWinningFactors),
      howItReducesPriceComparisonRisk: pickString(
        recommendation.howItReducesPriceComparisonRisk,
        "通过差异化组合、升级或场景变化，有助于相对降低直接同款比价风险。"
      ),
      whyItStillHasSalesPotential: pickString(
        recommendation.whyItStillHasSalesPotential,
        "该方向保留了原产品的部分需求逻辑，但仍需测试验证。"
      ),
      potentialRisks: pickStringArray(recommendation.potentialRisks),
      score: {
        salesPotentialScore,
        priceApprovalScore,
        finalRecommendationScore,
        confidence: "medium" as ConfidenceLevel,
        scoreReasons: [
          "分数来自 AI 结构化输出，已限制在 0-100 范围内。",
          "上架前仍需结合供应链、同款情况和实际核价结果进一步判断。"
        ]
      },
      level: pickEnum(
        recommendation.level,
        recommendationLevels,
        "small_batch_test"
      ) as RecommendationLevel
    };
  });
}

function mapActionSuggestions(raw: unknown): string[] {
  const suggestions = pickStringArray(raw);
  const requiredSuggestions = [
    "不建议直接复制同款。",
    "优先选择组合、升级、场景细分等差异化方向。",
    "上架前仍需核对 1688 同款情况。",
    "如果缺少评论和销量，建议补充数据后重新分析。",
    "上架前建议小批量测试，不要一次性大量铺货。"
  ];

  for (const suggestion of requiredSuggestions) {
    if (!suggestions.some((item) => item.includes(suggestion.replace("。", "")))) {
      suggestions.push(suggestion);
    }
  }

  return suggestions;
}

function hasEnglishHeavyReport(raw: AIAnalysisRawOutput): boolean {
  const textBlocks = [
    raw.finalConclusion,
    ...(raw.actionSuggestions ?? []),
    ...(raw.directCopyRisk?.reasons ?? []),
    ...(raw.directCopyRisk?.riskWarnings ?? []),
    ...(raw.directCopyRisk?.riskReductionSuggestions ?? []),
    ...(raw.hotProductAnalysis?.unknownFactors ?? []),
    ...(raw.hotProductAnalysis?.notes ?? []),
    ...(raw.hotProductAnalysis?.possibleWinningFactors ?? []).map((item) => item.reason),
    ...(raw.recommendations ?? []).flatMap((item) => [
      item.title,
      item.productIdea,
      item.reason,
      item.howItReducesPriceComparisonRisk,
      item.whyItStillHasSalesPotential,
      ...(item.relatedWinningFactors ?? []),
      ...(item.potentialRisks ?? [])
    ])
  ];

  return textBlocks.some((item) => typeof item === "string" && hasEnglishHeavyText(item));
}

export function parseAIAnalysisReport({
  product,
  rawText
}: ParseAIAnalysisReportParams): AnalysisReport {
  const raw = parseRawOutput(rawText);

  if (!raw.hotProductAnalysis || !raw.directCopyRisk || !raw.recommendations) {
    throw new Error("AI 返回内容结构不符合报告类型。");
  }

  if (!raw.finalConclusion || !raw.actionSuggestions) {
    throw new Error("AI 返回内容缺少最终结论或操作建议。");
  }

  const actionSuggestions = mapActionSuggestions(raw.actionSuggestions);

  if (hasEnglishHeavyReport(raw)) {
    actionSuggestions.push("当前 AI 输出存在部分英文表达，建议后续继续优化中文提示词。");
  }

  const report: AnalysisReport = {
    input: product,
    dataCompleteness: createDataCompleteness(product),
    imageRecognition: mapImageRecognition(raw.imageRecognition, product),
    hotProductAnalysis: mapHotProductAnalysis(raw.hotProductAnalysis),
    directCopyRisk: mapDirectCopyRisk(raw.directCopyRisk),
    recommendations: mapRecommendations(raw.recommendations),
    finalConclusion: pickString(raw.finalConclusion, "当前产品方向需要结合更多数据继续验证。"),
    actionSuggestions
  };

  try {
    return validateAndPolishAIReport(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知后处理错误";
    console.warn("[AI_REPORT_POLISH_FAILED]", {
      errorType: "polish",
      message
    });

    return report;
  }
}
