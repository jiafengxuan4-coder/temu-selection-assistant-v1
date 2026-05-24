import type {
  ConfidenceLevel,
  HotProductFactorType,
  PriceComparisonRiskLevel
} from "@/types/analysis";
import type {
  AnalysisReport,
  RecommendationDirectionType,
  RecommendationLevel
} from "@/types/recommendation";

const factorLabelMap: Record<HotProductFactorType, string> = {
  price: "价格因素",
  color: "颜色因素",
  style: "款式因素",
  image_click_rate: "图片点击率因素",
  comprehensive: "综合因素",
  unknown: "未知因素"
};

const confidenceLabelMap: Record<ConfidenceLevel, string> = {
  high: "高",
  medium: "中",
  low: "低",
  unknown: "未知"
};

const riskLevelLabelMap: Record<PriceComparisonRiskLevel, string> = {
  low: "低风险",
  medium: "中风险",
  high: "高风险",
  unknown: "未知"
};

const recommendationLevelLabelMap: Record<RecommendationLevel, string> = {
  priority_test: "推荐优先测试",
  small_batch_test: "可以小批量测试",
  cautious: "谨慎，不建议优先做",
  not_recommended: "不建议做"
};

const recommendationTypeLabelMap: Record<RecommendationDirectionType, string> = {
  bundle: "组合款方向",
  upgrade: "升级款方向",
  scene_segment: "场景细分方向",
  user_segment: "人群细分方向",
  function_difference: "功能差异方向",
  review_pain_point: "评论痛点改良方向",
  image_expression: "图片表达迁移方向",
  cautious: "谨慎方向"
};

function formatOptionalNumber(value: number | undefined): string {
  return typeof value === "number" ? String(value) : "未提供";
}

function formatList(items: string[]): string {
  if (items.length === 0) {
    return "- 暂无";
  }

  return items.map((item) => `- ${item}`).join("\n");
}

function getReadableRiskWarning(warning: string): string {
  if (warning.includes("核价")) {
    return "该产品仍需经过平台核价验证。";
  }

  return warning;
}

export function formatAnalysisReportText(report: AnalysisReport): string {
  const hasNoSales = !report.dataCompleteness.hasWeeklySales && !report.dataCompleteness.hasMonthlySales;
  const reviewStatus = report.dataCompleteness.hasReviews ? "已提供" : "未提供";
  const imageRecognition = report.imageRecognition;

  const dataCompletenessNotes = [
    ...report.dataCompleteness.missingFields,
    ...(hasNoSales ? ["缺少销量数据，销售潜力判断置信度降低。"] : []),
    ...(!report.dataCompleteness.hasRating ? ["缺少评分数据，无法判断用户满意度。"] : []),
    ...(!report.dataCompleteness.hasReviews ? ["缺少评论内容，本次不会分析用户真实反馈痛点。"] : [])
  ];

  const hotProductFactorsText = report.hotProductAnalysis.possibleWinningFactors
    .map(
      (factor, index) => [
        `${index + 1}.`,
        `- 因素：${factorLabelMap[factor.factor]}`,
        `- 置信度：${confidenceLabelMap[factor.confidence]}`,
        `- 判断理由：${factor.reason}`
      ].join("\n")
    )
    .join("\n\n");

  const riskWarnings = report.directCopyRisk.riskWarnings.map(getReadableRiskWarning);
  const riskWarningText = report.directCopyRisk.riskLevel === "high"
    ? ["直接跟款风险较高，不建议只改标题、图片或描述后上架。", ...riskWarnings]
    : riskWarnings;

  const recommendationsText = report.recommendations
    .map(
      (recommendation, index) => [
        `${index + 1}. ${recommendation.title}`,
        `- 推荐方向：${recommendationTypeLabelMap[recommendation.type]}`,
        `- 推荐产品方案：${recommendation.productIdea}`,
        `- 推荐等级：${recommendationLevelLabelMap[recommendation.level]}`,
        `- 销售潜力分：${recommendation.score.salesPotentialScore}`,
        `- 核价通过分：${recommendation.score.priceApprovalScore}`,
        `- 综合推荐分：${recommendation.score.finalRecommendationScore}`,
        `- 推荐理由：${recommendation.reason}`,
        `- 为什么降低比价风险：${recommendation.howItReducesPriceComparisonRisk}`,
        `- 为什么仍有销售机会：${recommendation.whyItStillHasSalesPotential}`,
        `- 潜在风险：\n${formatList(recommendation.potentialRisks)}`
      ].join("\n")
    )
    .join("\n\n");

  return [
    "# TEMU 核价选品报告",
    "",
    "## 一、爆款基础信息",
    "",
    `- 商品标题：${report.input.title}`,
    `- 商品类目：${report.input.category}`,
    `- 商品价格：${report.input.price}`,
    `- 周销量：${formatOptionalNumber(report.input.weeklySales)}`,
    `- 月销量：${formatOptionalNumber(report.input.monthlySales)}`,
    `- 商品评分：${formatOptionalNumber(report.input.rating)}`,
    `- 评论数据状态：${reviewStatus}`,
    "",
    "## 二、数据完整度提示",
    "",
    formatList(Array.from(new Set(dataCompletenessNotes))),
    "",
    "## 三、模拟图片识别结果",
    "",
    "当前版本为 MVP 演示版，图片识别暂未接入真实 AI，本部分为模拟图片识别结果。",
    "",
    `- 产品类型：${imageRecognition?.productType ?? "未知"}`,
    `- 类目：${imageRecognition?.category ?? "未知"}`,
    `- 主色：${imageRecognition?.mainColors.join("、") ?? "未知"}`,
    `- 产品结构：${imageRecognition?.productStructure ?? "未知"}`,
    `- 标准化程度：${imageRecognition?.standardizationLevel ?? "未知"}`,
    `- 使用场景：${imageRecognition?.usageScenes.join("、") ?? "未知"}`,
    `- 目标人群：${imageRecognition?.targetUsers.join("、") ?? "未知"}`,
    `- 图片点击潜力因素：${imageRecognition?.clickPotentialFactors.join("、") ?? "未知"}`,
    "",
    "## 四、疑似爆款因素",
    "",
    hotProductFactorsText || "- 暂无疑似爆款因素",
    "",
    "## 五、直接跟款风险",
    "",
    `- 风险等级：${riskLevelLabelMap[report.directCopyRisk.riskLevel]}`,
    `- 风险分：${report.directCopyRisk.riskScore}`,
    "- 风险原因：",
    formatList(report.directCopyRisk.reasons),
    "- 风险警告：",
    formatList(Array.from(new Set(riskWarningText))),
    "- 降低风险建议：",
    formatList(report.directCopyRisk.riskReductionSuggestions),
    "",
    "## 六、差异化推荐方向",
    "",
    recommendationsText,
    "",
    "## 七、最终结论",
    "",
    report.finalConclusion,
    "",
    "## 八、操作建议",
    "",
    formatList(report.actionSuggestions),
    "",
    "免责声明：本报告为选品辅助分析，不保证产品一定能爆，也不保证一定通过核价。上架前仍需结合供应链、1688 同款情况、核价结果和实际运营数据进一步判断。"
  ].join("\n");
}
