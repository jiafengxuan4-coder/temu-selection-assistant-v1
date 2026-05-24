import type { AnalysisReport, RecommendationDirection } from "@/types/recommendation";

const cautiousReplacements: Array<[RegExp, string]> = [
  [/一定能通过核价/g, "不代表可以通过核价"],
  [/一定能爆/g, "需要进一步验证销售机会"],
  [/百分百/g, "需要进一步验证"],
  [/必然/g, "可能"],
  [/必爆/g, "需要进一步验证"],
  [/必过/g, "不代表可以通过核价"],
  [/绝对/g, "相对"],
  [/保证/g, "不承诺"],
  [/一定/g, "可能"]
];

const vaguePhrases = [
  "优化产品",
  "提升品质",
  "做差异化",
  "改善图片",
  "提升卖点",
  "增强竞争力"
];

const reviewClaimPhrases = ["用户反馈", "评论中提到", "买家表示", "用户吐槽"];

function polishText(value: string): string {
  return cautiousReplacements.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    value
  );
}

function polishTextArray(values: string[]): string[] {
  return values.map(polishText);
}

function hasPetLeashSignal(report: AnalysisReport): boolean {
  const source = `${report.input.title} ${report.input.category}`.toLowerCase();
  return ["dog", "pet", "leash", "harness", "狗", "宠物", "牵引绳", "背带"].some((keyword) =>
    source.includes(keyword)
  );
}

function hasBundleDirection(recommendations: RecommendationDirection[]): boolean {
  return recommendations.some((recommendation) => {
    const text = `${recommendation.type} ${recommendation.title} ${recommendation.productIdea}`;
    return recommendation.type === "bundle" || text.includes("组合") || text.includes("套装");
  });
}

function moveFirstBundleToFront(recommendations: RecommendationDirection[]): RecommendationDirection[] {
  const bundleIndex = recommendations.findIndex((recommendation) => {
    const text = `${recommendation.type} ${recommendation.title} ${recommendation.productIdea}`;
    return recommendation.type === "bundle" || text.includes("组合") || text.includes("套装");
  });

  if (bundleIndex <= 0) {
    return recommendations;
  }

  const nextRecommendations = [...recommendations];
  const [bundleRecommendation] = nextRecommendations.splice(bundleIndex, 1);

  return [bundleRecommendation, ...nextRecommendations];
}

function createPetLeashBundleRecommendation(): RecommendationDirection {
  return {
    id: "ai-polished-pet-leash-bundle",
    type: "bundle",
    title: "反光狗牵引绳 + 宠物背带 + 拾便袋三件套",
    productIdea:
      "将单一反光牵引绳升级为夜间遛狗组合套装，包含反光牵引绳、透气宠物背带和可挂式拾便袋收纳器。",
    reason:
      "原爆款具备夜间遛狗场景和安全需求，组合套装能覆盖更完整的宠物出行场景，而不是直接复制单一牵引绳。",
    relatedWinningFactors: ["夜间遛狗场景", "安全需求", "组合延展"],
    howItReducesPriceComparisonRisk:
      "通过增加背带和拾便袋形成新的组合 SKU，有助于降低与原单品直接同款比价的风险。",
    whyItStillHasSalesPotential:
      "该方案保留了原爆款的夜间遛狗需求，同时增加背带和拾便袋相关需求。",
    potentialRisks: [
      "组合后采购成本和包装复杂度会上升",
      "需要确认三件套供应链是否稳定",
      "上架前仍需核查 1688 同款组合情况"
    ],
    score: {
      salesPotentialScore: 82,
      priceApprovalScore: 78,
      finalRecommendationScore: 80,
      confidence: "medium",
      scoreReasons: [
        "组合套装有助于形成新的 SKU。",
        "该方向仍需结合供应链和平台核价结果进一步验证。"
      ]
    },
    level: "priority_test"
  };
}

function isVagueRecommendation(recommendation: RecommendationDirection): boolean {
  const text = `${recommendation.title} ${recommendation.productIdea} ${recommendation.reason}`;
  const hasVaguePhrase = vaguePhrases.some((phrase) => text.includes(phrase));
  const hasSpecificSignal = [
    "组合",
    "套装",
    "三件套",
    "背带",
    "拾便袋",
    "夜光",
    "反光",
    "小型犬",
    "大型犬",
    "礼盒",
    "可叠戴",
    "场景",
    "人群"
  ].some((phrase) => text.includes(phrase));

  return hasVaguePhrase && !hasSpecificSignal;
}

function removeReviewClaimsWhenMissing(text: string, hasReviews: boolean): string {
  if (hasReviews || !reviewClaimPhrases.some((phrase) => text.includes(phrase))) {
    return text;
  }

  return "由于未提供评论内容，该判断仅基于商品信息和类目逻辑，需要进一步验证。";
}

function ensureSuggestion(suggestions: string[], suggestion: string): string[] {
  return suggestions.some((item) => item.includes(suggestion.replace("。", "")))
    ? suggestions
    : [...suggestions, suggestion];
}

function polishRecommendation(
  recommendation: RecommendationDirection,
  hasReviews: boolean
): RecommendationDirection {
  const potentialRisks = polishTextArray(
    recommendation.potentialRisks.map((risk) => removeReviewClaimsWhenMissing(risk, hasReviews))
  );

  if (isVagueRecommendation(recommendation)) {
    potentialRisks.push("该推荐方向目前偏泛，需要进一步明确具体产品组合、功能升级或目标人群后再测试。");
  }

  return {
    ...recommendation,
    title: polishText(removeReviewClaimsWhenMissing(recommendation.title, hasReviews)),
    productIdea: polishText(removeReviewClaimsWhenMissing(recommendation.productIdea, hasReviews)),
    reason: polishText(removeReviewClaimsWhenMissing(recommendation.reason, hasReviews)),
    relatedWinningFactors: polishTextArray(recommendation.relatedWinningFactors),
    howItReducesPriceComparisonRisk: polishText(
      removeReviewClaimsWhenMissing(recommendation.howItReducesPriceComparisonRisk, hasReviews)
    ),
    whyItStillHasSalesPotential: polishText(
      removeReviewClaimsWhenMissing(recommendation.whyItStillHasSalesPotential, hasReviews)
    ),
    potentialRisks,
    score: {
      ...recommendation.score,
      scoreReasons: polishTextArray(recommendation.score.scoreReasons)
    }
  };
}

export function validateAndPolishAIReport(report: AnalysisReport): AnalysisReport {
  const hasReviews = Boolean(report.input.reviewsText?.trim());
  let recommendations = report.recommendations.map((recommendation) =>
    polishRecommendation(recommendation, hasReviews)
  );

  if (hasPetLeashSignal(report) && !hasBundleDirection(recommendations)) {
    recommendations = [createPetLeashBundleRecommendation(), ...recommendations];
  }

  recommendations = recommendations
    .sort((current, next) => next.score.finalRecommendationScore - current.score.finalRecommendationScore)
    .slice(0, 3);

  if (hasPetLeashSignal(report)) {
    recommendations = moveFirstBundleToFront(recommendations);
  }

  let actionSuggestions = polishTextArray(report.actionSuggestions);

  if (recommendations.length < 3) {
    actionSuggestions = ensureSuggestion(
      actionSuggestions,
      "当前有效推荐方向较少，建议补充图片、销量或评论数据后重新分析。"
    );
  }

  actionSuggestions = ensureSuggestion(actionSuggestions, "不建议直接复制同款。");
  actionSuggestions = ensureSuggestion(actionSuggestions, "上架前核查 1688 是否存在同款或近似组合。");
  actionSuggestions = ensureSuggestion(actionSuggestions, "优先测试组合款、升级款或场景细分方向。");
  actionSuggestions = ensureSuggestion(actionSuggestions, "小批量测试，不建议一次性大量铺货。");
  actionSuggestions = ensureSuggestion(
    actionSuggestions,
    "如果缺少评论、销量或图片信息，建议补充后重新分析。"
  );

  const conclusion = polishText(report.finalConclusion);
  const requiredConclusion =
    "不建议直接复制同款，建议优先测试组合、升级或场景细分等差异化方向；本报告不代表一定通过核价。";
  const finalConclusion =
    conclusion.includes("不建议直接复制同款") &&
    conclusion.includes("差异化方向") &&
    conclusion.includes("不代表一定通过核价")
      ? conclusion
      : `${conclusion} ${requiredConclusion}`;

  return {
    ...report,
    hotProductAnalysis: {
      ...report.hotProductAnalysis,
      possibleWinningFactors: report.hotProductAnalysis.possibleWinningFactors.map((factor) => ({
        ...factor,
        reason: polishText(factor.reason)
      })),
      notes: polishTextArray(report.hotProductAnalysis.notes)
    },
    directCopyRisk: {
      ...report.directCopyRisk,
      reasons: polishTextArray(report.directCopyRisk.reasons),
      riskWarnings: polishTextArray(report.directCopyRisk.riskWarnings),
      riskReductionSuggestions: polishTextArray(report.directCopyRisk.riskReductionSuggestions)
    },
    recommendations,
    finalConclusion,
    actionSuggestions
  };
}
