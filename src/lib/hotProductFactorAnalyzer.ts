import type {
  ConfidenceLevel,
  HotProductAnalysis,
  HotProductFactor,
  HotProductFactorType,
  ImageRecognitionResult
} from "@/types/analysis";
import type { ProductInput } from "@/types/product";

export type HotProductFactorAnalyzerInput = {
  product: ProductInput;
  imageRecognition?: ImageRecognitionResult;
};

const BASE_UNKNOWN_FACTORS = [
  "平台流量",
  "活动资源",
  "广告投放",
  "短期低价冲量",
  "库存优势"
];

const ANALYSIS_NOTES = [
  "本分析为疑似爆款因素判断，不代表确定原因。",
  "不能作为产品会爆的确定结论。",
  "不能作为推荐方向会通过核价的确定结论。"
];

function isPositiveNumber(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function hasText(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function getImageFactorConfidence(
  imageRecognition: ImageRecognitionResult
): ConfidenceLevel {
  if (imageRecognition.visualImpactLevel && imageRecognition.visualImpactLevel !== "unknown") {
    return imageRecognition.visualImpactLevel;
  }

  return imageRecognition.confidence;
}

function getOverallConfidence(factors: HotProductFactor[], unknownFactors: string[]): ConfidenceLevel {
  if (factors.length === 0) {
    return "unknown";
  }

  const hasHighConfidenceFactor = factors.some((factor) => factor.confidence === "high");
  const hasLowConfidenceFactor = factors.some((factor) => factor.confidence === "low");
  const hasManyUnknowns = unknownFactors.length >= BASE_UNKNOWN_FACTORS.length + 3;

  if (hasManyUnknowns || hasLowConfidenceFactor) {
    return "low";
  }

  if (hasHighConfidenceFactor && factors.length >= 2) {
    return "high";
  }

  return "medium";
}

function getHotProductType(factors: HotProductFactor[]): HotProductFactorType {
  if (factors.length >= 3) {
    return "comprehensive";
  }

  return factors[0]?.factor ?? "unknown";
}

export function analyzeHotProductFactors(
  input: HotProductFactorAnalyzerInput
): HotProductAnalysis {
  const { product, imageRecognition } = input;
  const possibleWinningFactors: HotProductFactor[] = [];
  const unknownFactors = [...BASE_UNKNOWN_FACTORS];

  if (isPositiveNumber(product.price)) {
    possibleWinningFactors.push({
      factor: "price",
      confidence: "medium",
      reason:
        "当前价格可作为爆款因素之一，但不同类目没有固定爆款价格段，需要结合类目和竞品判断。"
    });
  } else {
    unknownFactors.push("价格数据不足");
  }

  if (imageRecognition) {
    if (imageRecognition.clickPotentialFactors.length > 0) {
      possibleWinningFactors.push({
        factor: "image_click_rate",
        confidence: getImageFactorConfidence(imageRecognition),
        reason: `图片具备疑似点击潜力因素：${imageRecognition.clickPotentialFactors.join("、")}。`
      });
    }

    if (imageRecognition.mainColors.length > 0) {
      possibleWinningFactors.push({
        factor: "color",
        confidence: "medium",
        reason: `图片主色为 ${imageRecognition.mainColors.join("、")}，颜色可能影响点击率和视觉吸引力，但不能据此做确定判断。`
      });
    }

    if (hasText(imageRecognition.styleDescription)) {
      possibleWinningFactors.push({
        factor: "style",
        confidence: "medium",
        reason: `款式、结构或造型可能是爆款因素之一：${imageRecognition.styleDescription.trim()}。`
      });
    }
  } else {
    unknownFactors.push("缺少图片识别结果，无法判断图片点击潜力");
  }

  if (!isPositiveNumber(product.weeklySales) && !isPositiveNumber(product.monthlySales)) {
    unknownFactors.push("缺少周销量和月销量，销售潜力判断置信度较低");
  }

  if (!isPositiveNumber(product.rating)) {
    unknownFactors.push("缺少评分数据，无法判断用户满意度");
  }

  if (!hasText(product.reviewsText)) {
    unknownFactors.push("缺少评论内容，无法分析用户真实反馈和痛点");
  }

  return {
    hotProductType: getHotProductType(possibleWinningFactors),
    possibleWinningFactors,
    unknownFactors,
    confidence: getOverallConfidence(possibleWinningFactors, unknownFactors),
    notes: ANALYSIS_NOTES
  };
}
