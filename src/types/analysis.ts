import type { ProductStructure, StandardizationLevel } from "./product";

export type ConfidenceLevel = "low" | "medium" | "high" | "unknown";

export type HotProductFactorType =
  | "price"
  | "color"
  | "style"
  | "image_click_rate"
  | "comprehensive"
  | "unknown";

export type HotProductFactor = {
  factor: HotProductFactorType;
  confidence: ConfidenceLevel;
  reason: string;
};

export type ImageRecognitionWarning = {
  code: string;
  message: string;
  severity: "low" | "medium" | "high";
};

export type ImageRecognitionResult = {
  productType: string;
  category: string;
  mainColors: string[];
  secondaryColors: string[];
  styleDescription: string;
  productStructure: ProductStructure;
  standardizationLevel: StandardizationLevel;
  visibleAccessories: string[];
  usageScenes: string[];
  targetUsers: string[];
  imageStyle: string;
  clickPotentialFactors: string[];
  sellingPointElements?: string[];
  visualImpactLevel?: ConfidenceLevel;
  imageClarityLevel?: ConfidenceLevel;
  unknownFields: string[];
  warnings: ImageRecognitionWarning[];
  confidence: ConfidenceLevel;
};

export type HotProductAnalysis = {
  hotProductType: HotProductFactorType;
  possibleWinningFactors: HotProductFactor[];
  unknownFactors: string[];
  confidence: ConfidenceLevel;
  notes: string[];
};

export type PriceComparisonRiskLevel = "low" | "medium" | "high" | "unknown";

export type PriceComparisonRisk = {
  riskLevel: PriceComparisonRiskLevel;
  riskScore: number;
  reasons: string[];
  riskWarnings: string[];
  riskReductionSuggestions: string[];
};
