import type { ConfidenceLevel, HotProductAnalysis, ImageRecognitionResult, PriceComparisonRisk } from "./analysis";
import type { DataCompleteness, ProductInput } from "./product";

export type RecommendationDirectionType =
  | "bundle"
  | "upgrade"
  | "scene_segment"
  | "user_segment"
  | "function_difference"
  | "review_pain_point"
  | "image_expression"
  | "cautious";

export type RecommendationLevel =
  | "priority_test"
  | "small_batch_test"
  | "cautious"
  | "not_recommended";

export type RecommendationScore = {
  salesPotentialScore: number;
  priceApprovalScore: number;
  finalRecommendationScore: number;
  confidence: ConfidenceLevel;
  scoreReasons: string[];
};

export type RecommendationDirection = {
  id: string;
  type: RecommendationDirectionType;
  title: string;
  productIdea: string;
  reason: string;
  relatedWinningFactors: string[];
  howItReducesPriceComparisonRisk: string;
  whyItStillHasSalesPotential: string;
  potentialRisks: string[];
  score: RecommendationScore;
  level: RecommendationLevel;
};

export type PackagingWorth = "值得" | "待观察" | "不建议";
export type PackagingProductType = "标品" | "半标品" | "非标品" | "混合型";
export type PackagingLevel = "低" | "中" | "高";
export type SkuDependencyLevel = "强依赖" | "中等依赖" | "弱依赖" | "不适用";
export type SkuConversionImpact = "高" | "中" | "低" | "不适用";
export type MaterialRequirement = "必须" | "必须，如果有组合配件" | "建议" | "建议，部分品类必须" | "可选";

export type ProductBasicsReport = {
  rawRecognizedTitle?: string;
  productName: string;
  productCategory: string;
  currentComposition: string;
  mainUse: string;
  targetUsers: string;
  usageScenes: string;
};

export type PackagingValueReport = {
  worthPackaging: PackagingWorth;
  productType: PackagingProductType;
  priceComparisonRisk: PackagingLevel;
  transformationSpace: PackagingLevel;
  imageExpressionSpace: PackagingLevel;
  skuDependency: SkuDependencyLevel;
  currentSkuInfo: string;
  skuConversionImpact: SkuConversionImpact;
  skuSuggestion: string;
  oneSentenceJudgment: string;
};

export type PrimaryCombinationPlan = {
  combinationName: string;
  combinationContent: string;
  targetUsers: string;
  usageScene: string;
  coreSellingPoints: string;
  whyPriorityTest: string;
  suitableImageTypes: string;
};

export type BackupCombinationPlan = {
  combinationName: string;
  combinationContent: string;
  targetUsers: string;
  usageScene: string;
  coreSellingPoints: string;
  whenToTry: string;
  notes: string;
};

export type MaterialChecklistItem = {
  materialType: string;
  requirement: MaterialRequirement;
  usage: string;
};

export type ImageGenerationPackage = {
  productName: string;
  productCategory: string;
  recommendedCombinationPlan: string;
  combinationContent: string;
  targetUsers: string;
  usageScene: string;
  coreSellingPoints: string;
  referenceImages: string;
  imageCount: string;
  imageRatio: string;
  imageStyle: string;
  restrictions: string;
  copyText: string;
};

export type TitleSellingPointPackage = {
  productName: string;
  productCategory: string;
  combinationPlan: string;
  productImages: string;
  targetPlatform: string;
  outputRequirements: string[];
  fixedRequirements: string[];
  copyText: string;
};

export type PreGenerationReport = {
  productBasics: ProductBasicsReport;
  packagingValue: PackagingValueReport;
  planA: PrimaryCombinationPlan;
  planB: BackupCombinationPlan;
  priorityAdvice: string;
  materialChecklist: MaterialChecklistItem[];
  imageGenerationPackage: ImageGenerationPackage;
  titleSellingPointPackage: TitleSellingPointPackage;
  boundaryReminder: string;
};

export type AnalysisReport = {
  input: ProductInput;
  dataCompleteness: DataCompleteness;
  imageRecognition?: ImageRecognitionResult;
  hotProductAnalysis: HotProductAnalysis;
  directCopyRisk: PriceComparisonRisk;
  recommendations: RecommendationDirection[];
  finalConclusion: string;
  actionSuggestions: string[];
  preGenerationReport: PreGenerationReport;
};
