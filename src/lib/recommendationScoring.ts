import type { ConfidenceLevel, HotProductFactor, PriceComparisonRisk } from "@/types/analysis";
import type { ProductStructure, StandardizationLevel } from "@/types/product";
import type {
  RecommendationDirectionType,
  RecommendationLevel,
  RecommendationScore
} from "@/types/recommendation";

export type RecommendationScoringInput = {
  directionType: RecommendationDirectionType;
  productStructure?: ProductStructure;
  standardizationLevel?: StandardizationLevel;
  hotProductFactors?: HotProductFactor[];
  directCopyRisk?: PriceComparisonRisk;
  hasWeeklySales?: boolean;
  hasMonthlySales?: boolean;
  hasRating?: boolean;
  hasReviews?: boolean;
  hasBundle?: boolean;
  hasUpgrade?: boolean;
  hasSceneSegment?: boolean;
  hasUserSegment?: boolean;
  hasImageExpression?: boolean;
  hasReviewPainPoint?: boolean;
};

export type RecommendationScoringResult = {
  score: RecommendationScore;
  level: RecommendationLevel;
};

const MIN_SCORE = 0;
const MAX_SCORE = 100;
const INITIAL_SALES_POTENTIAL_SCORE = 55;
const INITIAL_PRICE_APPROVAL_SCORE = 50;

function clampScore(score: number): number {
  return Math.min(MAX_SCORE, Math.max(MIN_SCORE, Math.round(score)));
}

function hasHotProductFactor(input: RecommendationScoringInput, factor: HotProductFactor["factor"]): boolean {
  return input.hotProductFactors?.some((item) => item.factor === factor) ?? false;
}

function getRecommendationLevel(finalRecommendationScore: number): RecommendationLevel {
  if (finalRecommendationScore >= 80) {
    return "priority_test";
  }

  if (finalRecommendationScore >= 60) {
    return "small_batch_test";
  }

  if (finalRecommendationScore >= 40) {
    return "cautious";
  }

  return "not_recommended";
}

function getConfidence(input: RecommendationScoringInput): ConfidenceLevel {
  const hasSalesData = Boolean(input.hasWeeklySales || input.hasMonthlySales);
  const hasImageFactor = Boolean(
    hasHotProductFactor(input, "image_click_rate") ||
      hasHotProductFactor(input, "color") ||
      hasHotProductFactor(input, "style")
  );
  const hasRiskJudgment = Boolean(input.directCopyRisk);
  const factorCount = input.hotProductFactors?.length ?? 0;

  if (hasSalesData && hasImageFactor && hasRiskJudgment) {
    return "high";
  }

  if (!hasSalesData && !input.hasRating && !input.hasReviews && factorCount < 2) {
    return "low";
  }

  return "medium";
}

function addReasonOnce(scoreReasons: string[], reason: string): void {
  if (!scoreReasons.includes(reason)) {
    scoreReasons.push(reason);
  }
}

export function calculateRecommendationScore(
  input: RecommendationScoringInput
): RecommendationScoringResult {
  let salesPotentialScore = INITIAL_SALES_POTENTIAL_SCORE;
  let priceApprovalScore = INITIAL_PRICE_APPROVAL_SCORE;
  const scoreReasons: string[] = [];
  const hotProductFactorCount = input.hotProductFactors?.length ?? 0;
  const hasSalesData = Boolean(input.hasWeeklySales || input.hasMonthlySales);

  if (input.hasWeeklySales) {
    salesPotentialScore += 8;
    addReasonOnce(scoreReasons, "有周销量数据，销售潜力判断依据更充分。");
  }

  if (input.hasMonthlySales) {
    salesPotentialScore += 10;
    addReasonOnce(scoreReasons, "有月销量数据，有助于判断需求稳定性。");
  }

  if (input.hasRating) {
    salesPotentialScore += 5;
    addReasonOnce(scoreReasons, "有评分数据，有助于判断用户满意度。");
  }

  if (input.hasReviews) {
    salesPotentialScore += 5;
    addReasonOnce(scoreReasons, "有评论内容，有助于判断真实反馈和改良机会。");
  }

  if (hotProductFactorCount >= 3) {
    salesPotentialScore += 8;
    addReasonOnce(scoreReasons, "疑似爆款因素较多，销售潜力判断依据相对更完整。");
  }

  if (hasHotProductFactor(input, "image_click_rate")) {
    salesPotentialScore += 8;
    addReasonOnce(scoreReasons, "图片点击潜力因素较明显，有助于保留原爆款的流量逻辑。");
  }

  if (hasHotProductFactor(input, "price")) {
    salesPotentialScore += 5;
    addReasonOnce(scoreReasons, "价格因素可能与原爆款需求相关，需要结合竞品进一步验证。");
  }

  if (hasHotProductFactor(input, "color")) {
    salesPotentialScore += 4;
    addReasonOnce(scoreReasons, "颜色因素可能影响点击率和视觉吸引力。");
  }

  if (hasHotProductFactor(input, "style")) {
    salesPotentialScore += 5;
    addReasonOnce(scoreReasons, "款式因素可能影响用户选择和转化。");
  }

  if (input.hasImageExpression) {
    salesPotentialScore += 5;
    addReasonOnce(scoreReasons, "图片表达迁移可能保留部分点击吸引力。");
  }

  if (input.hasSceneSegment) {
    salesPotentialScore += 5;
    addReasonOnce(scoreReasons, "场景细分有助于让购买理由更明确。");
  }

  if (input.hasUserSegment) {
    salesPotentialScore += 5;
    addReasonOnce(scoreReasons, "人群细分有助于提高推荐方向的针对性。");
  }

  if (!hasSalesData) {
    salesPotentialScore -= 8;
    addReasonOnce(scoreReasons, "缺少销量数据，销售潜力判断置信度降低。");
  }

  if (!input.hasRating) {
    salesPotentialScore -= 3;
    addReasonOnce(scoreReasons, "缺少评分数据，用户满意度判断需要进一步验证。");
  }

  if (!input.hasReviews) {
    salesPotentialScore -= 3;
    addReasonOnce(scoreReasons, "缺少评论内容，无法直接判断用户真实反馈。");
  }

  if (input.standardizationLevel === "standard") {
    salesPotentialScore -= 5;
    priceApprovalScore -= 12;
    addReasonOnce(scoreReasons, "该产品偏标品，直接跟款风险较高。");
  }

  if (input.directCopyRisk?.riskLevel === "high") {
    salesPotentialScore -= 5;
    priceApprovalScore -= 15;
    addReasonOnce(scoreReasons, "直接跟款风险较高，需要通过组合、升级或细分相对降低风险。");
  }

  if (input.hasBundle) {
    priceApprovalScore += 15;
    addReasonOnce(scoreReasons, "推荐方向包含组合方案，有助于形成新的 SKU，降低直接同款比价风险。");
  }

  if (input.hasUpgrade) {
    priceApprovalScore += 12;
    addReasonOnce(scoreReasons, "推荐方向包含升级方案，有助于和原爆款拉开差异。");
  }

  if (input.hasSceneSegment) {
    priceApprovalScore += 10;
    addReasonOnce(scoreReasons, "场景细分有助于形成差异化定位。");
  }

  if (input.hasUserSegment) {
    priceApprovalScore += 10;
    addReasonOnce(scoreReasons, "人群细分有助于减少直接同款比较。");
  }

  if (input.hasImageExpression) {
    priceApprovalScore += 6;
    addReasonOnce(scoreReasons, "图片表达迁移有助于保留点击逻辑，但仍需要产品差异支撑。");
  }

  if (input.hasReviewPainPoint) {
    priceApprovalScore += 8;
    addReasonOnce(scoreReasons, "评论痛点改良有助于形成新的产品价值点。");
  }

  if (input.productStructure === "bundle" || input.productStructure === "multi_pack") {
    priceApprovalScore += 8;
    addReasonOnce(scoreReasons, "产品结构为组合或多件套，相对降低直接同款比价风险。");
  }

  if (input.standardizationLevel === "semi_standard") {
    priceApprovalScore += 8;
    addReasonOnce(scoreReasons, "半标品具备通过组合、材质、颜色或场景做差异化的空间。");
  }

  if (input.standardizationLevel === "non_standard") {
    priceApprovalScore += 6;
    addReasonOnce(scoreReasons, "非标品更适合通过款式、图片表达和人群定位形成差异。");
  }

  if (input.directCopyRisk?.riskLevel === "low") {
    priceApprovalScore += 10;
    addReasonOnce(scoreReasons, "直接跟款风险判断较低，核价通过分相对提高。");
  }

  if (input.directCopyRisk?.riskLevel === "medium") {
    priceApprovalScore += 3;
    addReasonOnce(scoreReasons, "直接跟款风险为中等，仍建议保留明确差异点。");
  }

  if (input.productStructure === "single" && !input.hasBundle) {
    priceApprovalScore -= 10;
    addReasonOnce(scoreReasons, "单品且缺少组合方案，直接同款比较风险较高。");
  }

  if (input.directionType === "cautious") {
    priceApprovalScore -= 10;
    addReasonOnce(scoreReasons, "当前方向偏谨慎，不建议作为优先测试方案。");
  }

  const clampedSalesPotentialScore = clampScore(salesPotentialScore);
  const clampedPriceApprovalScore = clampScore(priceApprovalScore);
  const finalRecommendationScore = clampScore(
    clampedSalesPotentialScore * 0.4 + clampedPriceApprovalScore * 0.6
  );
  const level = getRecommendationLevel(finalRecommendationScore);

  if (scoreReasons.length === 0) {
    scoreReasons.push("当前信息有限，评分需要结合销量、图片因素和比价风险进一步验证。");
  }

  return {
    score: {
      salesPotentialScore: clampedSalesPotentialScore,
      priceApprovalScore: clampedPriceApprovalScore,
      finalRecommendationScore,
      confidence: getConfidence(input),
      scoreReasons
    },
    level
  };
}
