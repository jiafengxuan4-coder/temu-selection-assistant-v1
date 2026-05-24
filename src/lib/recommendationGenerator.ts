import type {
  HotProductAnalysis,
  ImageRecognitionResult,
  PriceComparisonRisk
} from "@/types/analysis";
import type { ProductInput, ProductStructure, StandardizationLevel } from "@/types/product";
import type {
  RecommendationDirection,
  RecommendationDirectionType,
  RecommendationLevel,
  RecommendationScore
} from "@/types/recommendation";

export type RecommendationGeneratorInput = {
  product: ProductInput;
  imageRecognition?: ImageRecognitionResult;
  hotProductAnalysis: HotProductAnalysis;
  directCopyRisk: PriceComparisonRisk;
  mode?: "default" | "advanced";
};

type ProductDomain = "pet" | "jewelry" | "clothing" | "general";

const DEFAULT_MAX_RECOMMENDATIONS = 3;
const ADVANCED_MAX_RECOMMENDATIONS = 5;

function hasText(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function includesAnyKeyword(value: string, keywords: string[]): boolean {
  const normalizedValue = value.toLowerCase();
  return keywords.some((keyword) => normalizedValue.includes(keyword.toLowerCase()));
}

function detectProductDomain(product: ProductInput): ProductDomain {
  const text = `${product.title} ${product.category}`;

  if (includesAnyKeyword(text, ["dog", "pet", "leash", "harness", "牵引绳", "宠物", "狗"])) {
    return "pet";
  }

  if (includesAnyKeyword(text, ["ring", "necklace", "jewelry", "戒指", "项链", "饰品"])) {
    return "jewelry";
  }

  if (includesAnyKeyword(text, ["clothing", "dress", "shirt", "服装", "女装", "男装"])) {
    return "clothing";
  }

  return "general";
}

function getProductStructure(imageRecognition?: ImageRecognitionResult): ProductStructure {
  return imageRecognition?.productStructure ?? "unknown";
}

function getStandardizationLevel(imageRecognition?: ImageRecognitionResult): StandardizationLevel {
  return imageRecognition?.standardizationLevel ?? "unknown";
}

function getRelatedWinningFactors(hotProductAnalysis: HotProductAnalysis): string[] {
  return hotProductAnalysis.possibleWinningFactors.map((factor) => factor.factor);
}

function getPlaceholderScore(type: RecommendationDirectionType): RecommendationScore {
  const scoreByType: Record<RecommendationDirectionType, RecommendationScore> = {
    bundle: {
      salesPotentialScore: 70,
      priceApprovalScore: 75,
      finalRecommendationScore: 73,
      confidence: "medium",
      scoreReasons: ["组合方向有助于形成新的 SKU，仍需结合供应链和竞品进一步验证。"]
    },
    upgrade: {
      salesPotentialScore: 72,
      priceApprovalScore: 72,
      finalRecommendationScore: 72,
      confidence: "medium",
      scoreReasons: ["升级方向有助于保留原需求并相对降低同款比价风险。"]
    },
    scene_segment: {
      salesPotentialScore: 68,
      priceApprovalScore: 70,
      finalRecommendationScore: 69,
      confidence: "medium",
      scoreReasons: ["场景细分有助于形成差异化表达，销售机会需要进一步验证。"]
    },
    user_segment: {
      salesPotentialScore: 68,
      priceApprovalScore: 70,
      finalRecommendationScore: 69,
      confidence: "medium",
      scoreReasons: ["人群细分有助于避开直接同款竞争，需求强度需要进一步验证。"]
    },
    function_difference: {
      salesPotentialScore: 72,
      priceApprovalScore: 72,
      finalRecommendationScore: 72,
      confidence: "medium",
      scoreReasons: ["功能差异有助于和原爆款拉开卖点距离。"]
    },
    review_pain_point: {
      salesPotentialScore: 70,
      priceApprovalScore: 72,
      finalRecommendationScore: 71,
      confidence: "medium",
      scoreReasons: ["评论痛点改良方向依赖用户反馈，建议结合真实评论继续验证。"]
    },
    image_expression: {
      salesPotentialScore: 65,
      priceApprovalScore: 62,
      finalRecommendationScore: 63,
      confidence: "medium",
      scoreReasons: ["图片表达迁移可能保留点击吸引力，但产品差异仍需同步验证。"]
    },
    cautious: {
      salesPotentialScore: 50,
      priceApprovalScore: 45,
      finalRecommendationScore: 47,
      confidence: "low",
      scoreReasons: ["当前更适合谨慎观察，建议补充更多产品和供应链信息。"]
    }
  };

  return scoreByType[type];
}

function getRecommendationLevel(score: RecommendationScore): RecommendationLevel {
  if (score.finalRecommendationScore >= 80) {
    return "priority_test";
  }

  if (score.finalRecommendationScore >= 60) {
    return "small_batch_test";
  }

  if (score.finalRecommendationScore >= 40) {
    return "cautious";
  }

  return "not_recommended";
}

function getOrderedTypes(
  productStructure: ProductStructure,
  standardizationLevel: StandardizationLevel,
  domain: ProductDomain
): RecommendationDirectionType[] {
  if (standardizationLevel === "standard") {
    return ["upgrade", "cautious", "scene_segment", "image_expression"];
  }

  if (standardizationLevel === "non_standard" || domain === "clothing") {
    return ["image_expression", "user_segment", "scene_segment", "upgrade"];
  }

  if (productStructure === "bundle" || productStructure === "multi_pack") {
    return ["upgrade", "scene_segment", "user_segment", "image_expression"];
  }

  return ["bundle", "upgrade", "scene_segment", "user_segment", "image_expression"];
}

function getBundleIdea(domain: ProductDomain, product: ProductInput): string {
  if (domain === "pet") {
    return "主产品 + 宠物背带 + 拾便袋，形成同场景遛狗组合。";
  }

  if (domain === "jewelry") {
    return "同风格 2 件套 / 3 件套，搭配收纳袋或礼盒包装。";
  }

  return `${product.category} 同需求组合套装，增加配件或多件套形成新 SKU。`;
}

function getUpgradeIdea(domain: ProductDomain, product: ProductInput): string {
  if (domain === "pet") {
    return "反光夜光、防爆冲、轻量透气等升级款方向。";
  }

  if (domain === "jewelry") {
    return "材质升级、可叠戴设计、礼盒包装等升级款方向。";
  }

  if (domain === "clothing") {
    return "围绕版型、面料、颜色或穿搭场景做轻量升级。";
  }

  return `${product.category} 功能、材质、规格或包装升级方向。`;
}

function getSegmentIdea(domain: ProductDomain, type: RecommendationDirectionType): string {
  if (domain === "pet") {
    return type === "user_segment"
      ? "按小型犬 / 大型犬 / 新手养宠人群进行细分。"
      : "按户外遛狗、夜间出行或旅行携带场景进行细分。";
  }

  if (domain === "jewelry") {
    return type === "user_segment"
      ? "按情侣、通勤、派对或节日礼物人群进行细分。"
      : "按通勤、聚会、礼物赠送等场景进行细分。";
  }

  if (domain === "clothing") {
    return type === "user_segment"
      ? "按通勤、约会、度假或特定身型人群进行细分。"
      : "按穿搭场景、季节或风格主题进行细分。";
  }

  return type === "user_segment"
    ? "按目标人群进行细分，减少和原爆款的直接比较。"
    : "按具体使用场景进行细分，强化差异化卖点。";
}

function getTitle(type: RecommendationDirectionType): string {
  const titleByType: Record<RecommendationDirectionType, string> = {
    bundle: "组合款方向",
    upgrade: "功能升级方向",
    scene_segment: "场景细分方向",
    user_segment: "人群细分方向",
    function_difference: "功能差异方向",
    review_pain_point: "评论痛点改良方向",
    image_expression: "图片表达迁移方向",
    cautious: "谨慎观察方向"
  };

  return titleByType[type];
}

function buildDirection(
  type: RecommendationDirectionType,
  product: ProductInput,
  domain: ProductDomain,
  input: RecommendationGeneratorInput,
  index: number
): RecommendationDirection {
  const score = getPlaceholderScore(type);
  const missingImageNote = input.imageRecognition
    ? ""
    : "缺少图片识别结果，推荐方向置信度较低。";
  const standardRiskNote =
    input.imageRecognition?.standardizationLevel === "standard"
      ? "该产品偏标品，比价风险较高，建议避免直接跟款。"
      : "";
  const highRiskNote =
    input.directCopyRisk.riskLevel === "high"
      ? "当前直接跟款风险较高，建议优先选择有差异的测试方向。"
      : "";
  const contextNotes = [missingImageNote, standardRiskNote, highRiskNote].filter(Boolean).join(" ");

  const baseRisks = [
    "供应链成本、竞品价格和真实需求仍需要进一步验证。",
    "如果差异点不够明显，仍可能面临同质化竞争。"
  ];

  if (type === "bundle") {
    return {
      id: `recommendation-${index + 1}-bundle`,
      type,
      title: getTitle(type),
      productIdea: getBundleIdea(domain, product),
      reason: `通过增加同场景配件或多件套，不是直接复制同款，可能保留原爆款需求并形成新的销售组合。 ${contextNotes}`.trim(),
      relatedWinningFactors: getRelatedWinningFactors(input.hotProductAnalysis),
      howItReducesPriceComparisonRisk: "组合套装有助于形成新的 SKU，相对降低直接同款比价风险。",
      whyItStillHasSalesPotential: "组合方向围绕同一需求延伸，可能承接原爆款的使用场景和购买动机。",
      potentialRisks: baseRisks,
      score,
      level: getRecommendationLevel(score)
    };
  }

  if (type === "upgrade") {
    return {
      id: `recommendation-${index + 1}-upgrade`,
      type,
      title: getTitle(type),
      productIdea: getUpgradeIdea(domain, product),
      reason: `通过功能、材质、结构或包装升级，不是直接复制同款，有助于和原爆款拉开差异。 ${contextNotes}`.trim(),
      relatedWinningFactors: getRelatedWinningFactors(input.hotProductAnalysis),
      howItReducesPriceComparisonRisk: "升级方向有助于建立新的卖点，相对降低只改标题或图片带来的比价风险。",
      whyItStillHasSalesPotential: "升级款仍围绕原有需求展开，可能保留基础购买意图，并通过新卖点提升测试价值。",
      potentialRisks: baseRisks,
      score,
      level: getRecommendationLevel(score)
    };
  }

  if (type === "scene_segment" || type === "user_segment") {
    return {
      id: `recommendation-${index + 1}-${type}`,
      type,
      title: getTitle(type),
      productIdea: getSegmentIdea(domain, type),
      reason: `通过场景或人群细分，不是直接复制同款，有助于把原爆款需求迁移到更具体的使用人群。 ${contextNotes}`.trim(),
      relatedWinningFactors: getRelatedWinningFactors(input.hotProductAnalysis),
      howItReducesPriceComparisonRisk: "场景或人群定位变化有助于形成差异化表达，相对降低同质化比较。",
      whyItStillHasSalesPotential: "细分方向仍围绕原产品需求展开，可能在更明确的人群或场景中获得测试机会。",
      potentialRisks: baseRisks,
      score,
      level: getRecommendationLevel(score)
    };
  }

  if (type === "review_pain_point") {
    return {
      id: `recommendation-${index + 1}-review-pain-point`,
      type,
      title: getTitle(type),
      productIdea: "基于已提供评论内容，围绕用户反馈中的不满点做改良款。",
      reason: `评论痛点改良不是直接复制同款，有助于把原爆款需求转化为更明确的改良方向。 ${contextNotes}`.trim(),
      relatedWinningFactors: getRelatedWinningFactors(input.hotProductAnalysis),
      howItReducesPriceComparisonRisk: "基于真实反馈做结构、材质、配件或体验改良，有助于相对降低直接同款风险。",
      whyItStillHasSalesPotential: "改良方向围绕用户反馈展开，可能保留原需求并补足部分体验缺口。",
      potentialRisks: ["评论样本可能不足，需要进一步验证反馈是否具有代表性。", ...baseRisks],
      score,
      level: getRecommendationLevel(score)
    };
  }

  if (type === "image_expression") {
    return {
      id: `recommendation-${index + 1}-image-expression`,
      type,
      title: getTitle(type),
      productIdea:
        domain === "clothing"
          ? "围绕款式、颜色、穿搭场景和主图表达做风格迁移。"
          : "保留高点击表达方式，同时更换产品结构、组合或目标场景。",
      reason: `图片表达迁移不是直接复制同款，重点迁移视觉吸引力和场景表达。 ${contextNotes}`.trim(),
      relatedWinningFactors: getRelatedWinningFactors(input.hotProductAnalysis),
      howItReducesPriceComparisonRisk: "图片表达迁移需要配合产品差异，才有助于相对降低同款比较。",
      whyItStillHasSalesPotential: "如果原图具备点击潜力，迁移视觉表达可能保留部分流量吸引力。",
      potentialRisks: ["只迁移图片表达但产品无差异，仍可能面临较高比价风险。", ...baseRisks],
      score,
      level: getRecommendationLevel(score)
    };
  }

  return {
    id: `recommendation-${index + 1}-cautious`,
    type,
    title: getTitle(type),
    productIdea: "暂不建议直接跟款，优先补充图片、类目、供应链或竞品信息后再测试。",
    reason: `当前信息更适合谨慎判断，建议先寻找组合、升级、场景或供应链差异。 ${contextNotes}`.trim(),
    relatedWinningFactors: getRelatedWinningFactors(input.hotProductAnalysis),
    howItReducesPriceComparisonRisk: "谨慎观察有助于避免在差异不足时直接进入同款比价。",
    whyItStillHasSalesPotential: "如果后续能补充明确差异点，仍可能转化为可测试方向。",
    potentialRisks: ["当前差异化依据不足，贸然测试可能面临较高核价和销售风险。"],
    score,
    level: getRecommendationLevel(score)
  };
}

export function generateRecommendationDirections(
  input: RecommendationGeneratorInput
): RecommendationDirection[] {
  const mode = input.mode ?? "default";
  const maxCount = mode === "advanced" ? ADVANCED_MAX_RECOMMENDATIONS : DEFAULT_MAX_RECOMMENDATIONS;
  const domain = detectProductDomain(input.product);
  const productStructure = getProductStructure(input.imageRecognition);
  const standardizationLevel = getStandardizationLevel(input.imageRecognition);
  const orderedTypes = getOrderedTypes(productStructure, standardizationLevel, domain);
  const canUseReviewPainPoint = mode === "advanced" && hasText(input.product.reviewsText);
  const candidateTypes = canUseReviewPainPoint
    ? [...orderedTypes, "review_pain_point" as RecommendationDirectionType]
    : orderedTypes;
  const uniqueTypes = Array.from(new Set(candidateTypes));

  return uniqueTypes
    .slice(0, maxCount)
    .map((type, index) => buildDirection(type, input.product, domain, input, index));
}
