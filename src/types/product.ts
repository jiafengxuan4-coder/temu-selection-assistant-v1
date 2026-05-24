export type ProductImageInput = {
  imageBase64: string;
  imageMimeType: string;
  imageFileName: string;
};

export type ProductPriceSource =
  | "final_price"
  | "estimated_price"
  | "coupon_price"
  | "discount_price"
  | "current_sale_price"
  | "previous_price"
  | "original_price"
  | "strikethrough_price"
  | "uncertain";

export type ProductPriceCandidate = {
  value: number;
  display: string;
  currency?: string;
  source?: ProductPriceSource | "other";
  reason?: string;
};

export type ProductInput = {
  imageFileName?: string;
  imageUrl?: string;
  imageBase64?: string;
  imageMimeType?: string;
  images?: ProductImageInput[];
  title: string;
  category: string;
  price: number;
  priceDisplay?: string;
  priceCurrency?: string;
  priceSource?: ProductPriceSource;
  priceCandidates?: ProductPriceCandidate[];
  weeklySales?: number;
  monthlySales?: number;
  rating?: number;
  reviewsText?: string;
};

export type RecognizedProductFields = {
  title?: string;
  category?: string;
  price?: number;
  priceDisplay?: string;
  priceCurrency?: string;
  priceSource?: ProductPriceSource;
  priceCandidates?: ProductPriceCandidate[];
  weeklySales?: number;
  monthlySales?: number;
  rating?: number;
  reviewCount?: number;
  reviewsText?: string;
  confidence?: "low" | "medium" | "high" | "unknown";
  missingFields?: string[];
  warnings?: string[];
  imageCount?: number;
  rawText?: string;
};

export type ProductStructure = "single" | "bundle" | "multi_pack" | "unknown";

export type StandardizationLevel =
  | "standard"
  | "semi_standard"
  | "non_standard"
  | "unknown";

export type DataCompleteness = {
  hasImage: boolean;
  hasTitle: boolean;
  hasCategory: boolean;
  hasPrice: boolean;
  hasWeeklySales: boolean;
  hasMonthlySales: boolean;
  hasRating: boolean;
  hasReviews: boolean;
  missingFields: string[];
  confidenceImpact: "low" | "medium" | "high";
};

