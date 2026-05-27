import type {
  ProductInput,
  ProductStructure,
  RecognizedProductFields,
  StandardizationLevel
} from "@/types/product";
import type {
  AnalysisReport,
  MaterialRequirement,
  PackagingLevel,
  PackagingProductType,
  PackagingWorth,
  SkuConversionImpact,
  SkuDependencyLevel
} from "@/types/recommendation";
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

export type AnalyzeModelInfo = {
  provider: string;
  textModel: string;
  visionModel: string;
};

export type AnalyzeProductSuccessResponse = {
  ok: true;
  data: AnalysisReport;
  source: "api" | "mock_fallback";
  message?: string;
  recognizedFields?: RecognizedProductFields;
  modelInfo?: AnalyzeModelInfo;
};

export type AnalyzeProductErrorResponse = {
  ok: false;
  error: string;
  recognizedFields?: RecognizedProductFields;
};

export type AnalyzeProductResponse =
  | AnalyzeProductSuccessResponse
  | AnalyzeProductErrorResponse;

export type AIPreGenerationRawOutput = {
  productBasics?: {
    rawRecognizedTitle?: string;
    productName?: string;
    productCategory?: string;
    currentComposition?: string;
    mainUse?: string;
    targetUsers?: string;
    usageScenes?: string;
  };
  packagingValue?: {
    worthPackaging?: PackagingWorth;
    productType?: PackagingProductType;
    priceComparisonRisk?: PackagingLevel;
    transformationSpace?: PackagingLevel;
    imageExpressionSpace?: PackagingLevel;
    skuDependency?: SkuDependencyLevel;
    currentSkuInfo?: string;
    skuConversionImpact?: SkuConversionImpact;
    skuSuggestion?: string;
    oneSentenceJudgment?: string;
  };
  planA?: {
    combinationName?: string;
    combinationContent?: string;
    targetUsers?: string;
    usageScene?: string;
    coreSellingPoints?: string;
    whyPriorityTest?: string;
    suitableImageTypes?: string;
  };
  planB?: {
    combinationName?: string;
    combinationContent?: string;
    targetUsers?: string;
    usageScene?: string;
    coreSellingPoints?: string;
    whenToTry?: string;
    notes?: string;
  };
  materialChecklist?: Array<{
    materialType?: string;
    requirement?: MaterialRequirement;
    usage?: string;
  }>;
  imageGenerationPackage?: {
    productName?: string;
    productCategory?: string;
    recommendedCombinationPlan?: string;
    combinationContent?: string;
    targetUsers?: string;
    usageScene?: string;
    coreSellingPoints?: string;
    referenceImages?: string;
    imageCount?: string;
    imageRatio?: string;
    imageStyle?: string;
    restrictions?: string;
    copyText?: string;
  };
  titleSellingPointPackage?: {
    productName?: string;
    productCategory?: string;
    combinationPlan?: string;
    productImages?: string;
    targetPlatform?: string;
    outputRequirements?: string[];
    fixedRequirements?: string[];
    copyText?: string;
  };
  boundaryReminder?: string;
};

export type AIAnalysisRawOutput = {
  preGenerationReport?: AIPreGenerationRawOutput;
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
