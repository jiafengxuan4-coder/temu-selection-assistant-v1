import type { PriceComparisonRisk, PriceComparisonRiskLevel } from "@/types/analysis";
import type { ProductStructure, StandardizationLevel } from "@/types/product";

export type PriceComparisonRiskAnalyzerInput = {
  standardizationLevel: StandardizationLevel;
  productStructure: ProductStructure;
  isEasilyFoundOn1688?: boolean;
  isLowCostEasyCopy?: boolean;
  hasBundle?: boolean;
  hasFactoryExclusive?: boolean;
  hasCustomization?: boolean;
  hasFunctionUpgrade?: boolean;
  hasSceneChange?: boolean;
  hasUserSegment?: boolean;
  hasMaterialDifference?: boolean;
  hasColorDifference?: boolean;
  hasSpecificationDifference?: boolean;
  hasPackagingDifference?: boolean;
  hasReviewPainPointImprovement?: boolean;
};

const MIN_RISK_SCORE = 0;
const MAX_RISK_SCORE = 100;
const DEFAULT_RISK_SCORE = 50;

function clampRiskScore(score: number): number {
  return Math.min(MAX_RISK_SCORE, Math.max(MIN_RISK_SCORE, score));
}

function getRiskLevel(riskScore: number): PriceComparisonRiskLevel {
  if (riskScore <= 39) {
    return "low";
  }

  if (riskScore <= 69) {
    return "medium";
  }

  return "high";
}

function hasAnyProductDifference(input: PriceComparisonRiskAnalyzerInput): boolean {
  return Boolean(
    input.hasMaterialDifference ||
      input.hasColorDifference ||
      input.hasSpecificationDifference ||
      input.hasPackagingDifference
  );
}

function hasAnyCoreDifferentiation(input: PriceComparisonRiskAnalyzerInput): boolean {
  return Boolean(
    input.hasBundle ||
      input.hasFactoryExclusive ||
      input.hasCustomization ||
      input.hasFunctionUpgrade ||
      input.hasSceneChange ||
      input.hasUserSegment ||
      hasAnyProductDifference(input)
  );
}

export function analyzePriceComparisonRisk(
  input: PriceComparisonRiskAnalyzerInput
): PriceComparisonRisk {
  let riskScore = DEFAULT_RISK_SCORE;
  const reasons: string[] = [];
  const riskWarnings: string[] = [];
  const riskReductionSuggestions: string[] = [];

  if (input.standardizationLevel === "standard") {
    riskScore += 15;
    reasons.push("标品直接跟款，容易被平台比价。");
    riskWarnings.push("该产品偏标品，需要功能升级、定制、组合或供应链优势才能降低比价风险。");
  }

  if (input.productStructure === "single") {
    riskScore += 10;
    reasons.push("单品结构较容易被同款比较，核价风险相对较高。");
  }

  if (input.isEasilyFoundOn1688) {
    riskScore += 15;
    reasons.push("1688 容易找到同款，核价风险较高。");
  }

  if (input.isLowCostEasyCopy) {
    riskScore += 15;
    reasons.push("低成本易复制产品，容易陷入价格竞争。");
  }

  if (!input.hasBundle && input.productStructure !== "bundle" && input.productStructure !== "multi_pack") {
    riskScore += 10;
    reasons.push("缺少组合或多件套差异，直接同款比价风险较高。");
    riskReductionSuggestions.push("建议考虑组合套装或多件套方案。");
  }

  if (!input.hasFactoryExclusive) {
    riskScore += 10;
    reasons.push("缺少工厂专供优势，较难降低直接同款比价风险。");
  }

  if (!input.hasCustomization) {
    riskScore += 10;
    reasons.push("缺少定制差异，产品同质化风险较高。");
  }

  if (!input.hasFactoryExclusive && !input.hasCustomization) {
    riskReductionSuggestions.push("建议评估是否具备工厂专供、定制颜色、定制包装或专属配件。");
  }

  if (!input.hasFunctionUpgrade) {
    riskScore += 10;
    reasons.push("缺少功能升级，和原爆款拉开差异的空间有限。");
    riskReductionSuggestions.push("建议考虑功能升级或结构升级。");
  }

  if (!input.hasSceneChange) {
    riskScore += 10;
    reasons.push("缺少使用场景变化，差异化定位不够明显。");
    riskReductionSuggestions.push("建议考虑使用场景细分。");
  }

  if (!input.hasUserSegment) {
    riskScore += 10;
    reasons.push("缺少目标人群细分，容易和原产品形成直接比较。");
    riskReductionSuggestions.push("建议考虑目标人群细分。");
  }

  if (!hasAnyProductDifference(input)) {
    riskScore += 10;
    reasons.push("缺少材质、颜色、规格或包装差异，同质化风险较高。");
  }

  if (input.hasBundle || input.productStructure === "bundle" || input.productStructure === "multi_pack") {
    riskScore -= 15;
    reasons.push("组合套装或多件套有助于形成新的 SKU。");
  }

  if (input.hasFactoryExclusive || input.hasCustomization) {
    riskScore -= 15;
    reasons.push("工厂专供或定制有助于相对降低直接同款比价风险。");
  }

  if (input.hasFunctionUpgrade) {
    riskScore -= 10;
    reasons.push("功能升级有助于和原爆款拉开差异。");
  }

  if (input.hasSceneChange || input.hasUserSegment) {
    riskScore -= 10;
    reasons.push("场景或人群细分有助于形成差异化定位。");
  }

  if (hasAnyProductDifference(input)) {
    riskScore -= 10;
    reasons.push("材质、颜色、规格或包装差异可以相对降低同质化。");
  }

  if (input.hasReviewPainPointImprovement) {
    riskScore -= 10;
    reasons.push("基于评论痛点改良有助于形成新的产品价值点。");
  }

  if (!hasAnyCoreDifferentiation(input)) {
    reasons.push("缺少组合、升级或定制差异，直接跟款风险较高。");
  }

  const clampedRiskScore = clampRiskScore(riskScore);
  const riskLevel = getRiskLevel(clampedRiskScore);

  if (riskLevel === "high") {
    riskWarnings.push("直接跟款风险较高，不建议只改标题、图片或描述后上架。");
    riskWarnings.push("不保证该产品能通过核价。");
  }

  return {
    riskLevel,
    riskScore: clampedRiskScore,
    reasons,
    riskWarnings,
    riskReductionSuggestions
  };
}
