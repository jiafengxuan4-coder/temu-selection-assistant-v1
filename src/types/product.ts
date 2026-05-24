export type ProductInput = {
  imageFileName?: string;
  imageUrl?: string;
  title: string;
  category: string;
  price: number;
  weeklySales?: number;
  monthlySales?: number;
  rating?: number;
  reviewsText?: string;
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
