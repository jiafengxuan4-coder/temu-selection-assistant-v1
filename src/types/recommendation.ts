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

export type AnalysisReport = {
  input: ProductInput;
  dataCompleteness: DataCompleteness;
  imageRecognition?: ImageRecognitionResult;
  hotProductAnalysis: HotProductAnalysis;
  directCopyRisk: PriceComparisonRisk;
  recommendations: RecommendationDirection[];
  finalConclusion: string;
  actionSuggestions: string[];
};
