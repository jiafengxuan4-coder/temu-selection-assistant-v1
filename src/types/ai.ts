import type {
  ProductInput,
  ProductStructure,
  RecognizedProductFields,
  StandardizationLevel
} from "@/types/product";
import type { AnalysisReport } from "@/types/recommendation";
import type {
  ConfidenceLevel,
  HotProductFactorType,
  PriceComparisonRiskLevel
} from "@/types/analysis";
import type {
  RecommendationDirectionType,
  RecommendationLevel
} from "@/types/recommendation";

export type AnalyzeProductRequest = {
  product: ProductInput;
};

export type AnalyzeProductSuccessResponse = {
  ok: true;
  data: AnalysisReport;
  source: "api" | "mock_fallback";
  message?: string;
  recognizedFields?: RecognizedProductFields;
};

export type AnalyzeProductErrorResponse = {
  ok: false;
  error: string;
  recognizedFields?: RecognizedProductFields;
};

export type AnalyzeProductResponse =
  | AnalyzeProductSuccessResponse
  | AnalyzeProductErrorResponse;

export type AIAnalysisRawOutput = {
  imageRecognition?: {
    productType?: string;
    category?: string;
    mainColors?: string[];
    secondaryColors?: string[];
    styleDescription?: string;
    productStructure?: ProductStructure;
    standardizationLevel?: StandardizationLevel;
    visibleAccessories?: string[];
    usageScenes?: string[];
    targetUsers?: string[];
    imageStyle?: string;
    clickPotentialFactors?: string[];
    sellingPointElements?: string[];
    unknownFields?: string[];
  };
  hotProductAnalysis?: {
    hotProductType?: HotProductFactorType;
    possibleWinningFactors?: Array<{
      factor?: HotProductFactorType;
      confidence?: ConfidenceLevel;
      reason?: string;
    }>;
    unknownFactors?: string[];
    confidence?: ConfidenceLevel;
    notes?: string[];
  };
  directCopyRisk?: {
    riskLevel?: PriceComparisonRiskLevel;
    riskScore?: number;
    reasons?: string[];
    riskWarnings?: string[];
    riskReductionSuggestions?: string[];
  };
  recommendations?: Array<{
    type?: RecommendationDirectionType;
    title?: string;
    productIdea?: string;
    reason?: string;
    relatedWinningFactors?: string[];
    howItReducesPriceComparisonRisk?: string;
    whyItStillHasSalesPotential?: string;
    potentialRisks?: string[];
    salesPotentialScore?: number;
    priceApprovalScore?: number;
    finalRecommendationScore?: number;
    level?: RecommendationLevel;
  }>;
  finalConclusion?: string;
  actionSuggestions?: string[];
};
