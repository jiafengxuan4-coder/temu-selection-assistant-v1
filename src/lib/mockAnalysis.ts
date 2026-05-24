import { analyzeHotProductFactors } from "@/lib/hotProductFactorAnalyzer";
import { analyzePriceComparisonRisk } from "@/lib/priceComparisonRiskAnalyzer";
import { generateRecommendationDirections } from "@/lib/recommendationGenerator";
import { calculateRecommendationScore } from "@/lib/recommendationScoring";
import type { ImageRecognitionResult } from "@/types/analysis";
import type { DataCompleteness, ProductInput } from "@/types/product";
import type {
  AnalysisReport,
  RecommendationDirection,
  RecommendationDirectionType
} from "@/types/recommendation";

function includesAnyKeyword(value: string, keywords: string[]): boolean {
  const normalizedValue = value.toLowerCase();
  return keywords.some((keyword) => normalizedValue.includes(keyword.toLowerCase()));
}

function createMockImageRecognition(product: ProductInput): ImageRecognitionResult {
  const text = `${product.title} ${product.category}`;
  const baseResult = {
    secondaryColors: [],
    styleDescription: "基于标题和类目的模拟识别结果",
    visibleAccessories: [],
    imageStyle: "模拟主图识别",
    sellingPointElements: [],
    visualImpactLevel: "medium" as const,
    imageClarityLevel: "medium" as const,
    unknownFields: ["真实图片识别结果"],
    warnings: [
      {
        code: "MOCK_IMAGE_RECOGNITION",
        message: "当前版本未接入真实图片识别，使用模拟图片识别结果。",
        severity: "low" as const
      }
    ],
    confidence: "medium" as const
  };

  if (includesAnyKeyword(text, ["狗", "宠物", "牵引绳", "pet", "dog", "leash"])) {
    return {
      ...baseResult,
      productType: "宠物牵引用品",
      category: "宠物用品",
      mainColors: ["黑色", "橙色"],
      productStructure: "single",
      standardizationLevel: "semi_standard",
      usageScenes: ["户外遛狗", "宠物出行"],
      targetUsers: ["养狗人群", "宠物主人"],
      clickPotentialFactors: ["产品主体清晰", "使用场景明确", "有组合延展空间"]
    };
  }

  if (includesAnyKeyword(text, ["戒指", "项链", "饰品", "jewelry", "ring", "necklace"])) {
    return {
      ...baseResult,
      productType: "饰品",
      category: "饰品",
      mainColors: ["金色", "银色"],
      productStructure: "single",
      standardizationLevel: "semi_standard",
      usageScenes: ["日常穿搭", "礼物场景"],
      targetUsers: ["女性用户", "穿搭用户"],
      clickPotentialFactors: ["颜色醒目", "款式有延展空间", "适合多件套组合"]
    };
  }

  if (includesAnyKeyword(text, ["服装", "女装", "男装", "clothing", "dress", "shirt"])) {
    return {
      ...baseResult,
      productType: "服装",
      category: "服装",
      mainColors: ["基础色", "流行色"],
      productStructure: "single",
      standardizationLevel: "non_standard",
      usageScenes: ["日常穿搭", "场景化穿搭"],
      targetUsers: ["服装消费人群"],
      clickPotentialFactors: ["款式影响点击", "图片表达影响转化"]
    };
  }

  return {
    ...baseResult,
    productType: product.category,
    category: product.category,
    mainColors: ["未知"],
    productStructure: "single",
    standardizationLevel: "unknown",
    usageScenes: ["待补充"],
    targetUsers: ["待补充"],
    clickPotentialFactors: ["需要补充图片识别结果"]
  };
}

function getDataCompleteness(product: ProductInput): DataCompleteness {
  const hasWeeklySales = typeof product.weeklySales === "number";
  const hasMonthlySales = typeof product.monthlySales === "number";
  const hasRating = typeof product.rating === "number";
  const hasReviews = Boolean(product.reviewsText?.trim());
  const missingFields: string[] = [];

  if (!product.imageFileName && !product.imageUrl) {
    missingFields.push("未提供真实爆款图片，本版本使用模拟图片识别结果。");
  }

  if (!hasWeeklySales) {
    missingFields.push("未提供周销量，销售潜力判断置信度降低。");
  }

  if (!hasMonthlySales) {
    missingFields.push("未提供月销量，需求稳定性判断置信度降低。");
  }

  if (!hasRating) {
    missingFields.push("未提供评分，无法判断用户满意度。");
  }

  if (!hasReviews) {
    missingFields.push("未提供评论内容，本次分析不包含用户真实反馈痛点。");
  }

  return {
    hasImage: Boolean(product.imageFileName || product.imageUrl),
    hasTitle: Boolean(product.title.trim()),
    hasCategory: Boolean(product.category.trim()),
    hasPrice: product.price > 0,
    hasWeeklySales,
    hasMonthlySales,
    hasRating,
    hasReviews,
    missingFields,
    confidenceImpact: missingFields.length >= 4 ? "high" : missingFields.length >= 2 ? "medium" : "low"
  };
}

function getScoringFlags(type: RecommendationDirectionType) {
  return {
    hasBundle: type === "bundle",
    hasUpgrade: type === "upgrade" || type === "function_difference",
    hasSceneSegment: type === "scene_segment",
    hasUserSegment: type === "user_segment",
    hasImageExpression: type === "image_expression",
    hasReviewPainPoint: type === "review_pain_point"
  };
}

function applyScores(
  recommendations: RecommendationDirection[],
  product: ProductInput,
  imageRecognition: ImageRecognitionResult,
  hotProductFactors: AnalysisReport["hotProductAnalysis"]["possibleWinningFactors"],
  directCopyRisk: AnalysisReport["directCopyRisk"]
): RecommendationDirection[] {
  return recommendations.map((recommendation) => {
    const scoringResult = calculateRecommendationScore({
      directionType: recommendation.type,
      productStructure: imageRecognition.productStructure,
      standardizationLevel: imageRecognition.standardizationLevel,
      hotProductFactors,
      directCopyRisk,
      hasWeeklySales: typeof product.weeklySales === "number",
      hasMonthlySales: typeof product.monthlySales === "number",
      hasRating: typeof product.rating === "number",
      hasReviews: Boolean(product.reviewsText?.trim()),
      ...getScoringFlags(recommendation.type)
    });

    return {
      ...recommendation,
      score: scoringResult.score,
      level: scoringResult.level
    };
  });
}

function getFinalConclusion(recommendations: RecommendationDirection[]): string {
  const highestScore = Math.max(
    ...recommendations.map((recommendation) => recommendation.score.finalRecommendationScore)
  );

  if (highestScore >= 80) {
    return "当前爆款具备可迁移元素，建议优先测试高分差异化方向，但不建议直接复制同款。";
  }

  if (highestScore >= 60) {
    return "当前产品存在测试价值，建议小批量测试，并优先选择比价风险较低的方向。";
  }

  return "当前产品方向需要谨慎，建议补充更多销量、评论或图片信息后再判断。";
}

export function generateMockAnalysisReport(product: ProductInput): AnalysisReport {
  const imageRecognition = createMockImageRecognition(product);
  const dataCompleteness = getDataCompleteness(product);
  const hotProductAnalysis = analyzeHotProductFactors({
    product,
    imageRecognition
  });
  const directCopyRisk = analyzePriceComparisonRisk({
    standardizationLevel: imageRecognition.standardizationLevel,
    productStructure: imageRecognition.productStructure,
    isEasilyFoundOn1688: imageRecognition.standardizationLevel === "standard",
    isLowCostEasyCopy: imageRecognition.standardizationLevel === "standard" && product.price <= 10,
    hasBundle: imageRecognition.productStructure === "bundle" || imageRecognition.productStructure === "multi_pack",
    hasFunctionUpgrade: false,
    hasSceneChange: imageRecognition.usageScenes.length > 0,
    hasUserSegment: imageRecognition.targetUsers.length > 0,
    hasColorDifference: imageRecognition.mainColors.length > 1
  });
  const recommendations = generateRecommendationDirections({
    product,
    imageRecognition,
    hotProductAnalysis,
    directCopyRisk,
    mode: "default"
  });
  const scoredRecommendations = applyScores(
    recommendations,
    product,
    imageRecognition,
    hotProductAnalysis.possibleWinningFactors,
    directCopyRisk
  ).sort((current, next) => next.score.finalRecommendationScore - current.score.finalRecommendationScore);

  return {
    input: product,
    dataCompleteness,
    imageRecognition,
    hotProductAnalysis,
    directCopyRisk,
    recommendations: scoredRecommendations,
    finalConclusion: getFinalConclusion(scoredRecommendations),
    actionSuggestions: [
      "不建议直接复制同款。",
      "优先选择组合、升级、场景细分等差异化方向。",
      "上架前仍需核对 1688 同款情况。",
      "如果缺少评论和销量，建议补充数据后重新分析。",
      "下一版接入真实图片识别后，图片点击潜力判断会更准确。"
    ]
  };
}
