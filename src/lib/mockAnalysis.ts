import { analyzeHotProductFactors } from "@/lib/hotProductFactorAnalyzer";
import { analyzePriceComparisonRisk } from "@/lib/priceComparisonRiskAnalyzer";
import { generateRecommendationDirections } from "@/lib/recommendationGenerator";
import { calculateRecommendationScore } from "@/lib/recommendationScoring";
import type { ImageRecognitionResult } from "@/types/analysis";
import type { DataCompleteness, ProductInput } from "@/types/product";
import type {
  AnalysisReport,
  RecommendationDirection,
  RecommendationDirectionType
} from "@/types/recommendation";

function formatSpecsLines(product: ProductInput): string[] {
  const specs = product.productSpecs ?? {};
  return [
    `主产品规格：${specs.mainProductSpec ?? "未提供"}`,
    `配件规格：${specs.accessorySpec ?? "未提供"}`,
    `产品尺寸：${specs.productSize ?? "未提供"}`,
    `包装重量：${specs.packageWeight ?? "未提供"}`,
    `包装尺寸：${specs.packageSize ?? "未提供"}`,
    `颜色/尺码选项：${specs.colorSizeOptions ?? "未提供"}`
  ];
}
function includesAnyKeyword(value: string, keywords: string[]): boolean {
  const normalizedValue = value.toLowerCase();
  return keywords.some((keyword) => normalizedValue.includes(keyword.toLowerCase()));
}

function createMockImageRecognition(product: ProductInput): ImageRecognitionResult {
  const text = `${product.title} ${product.category}`;
  const baseResult = {
    secondaryColors: [],
    styleDescription: "基于标题、类目和上传素材的模拟识别结果",
    visibleAccessories: [],
    imageStyle: "电商商品图",
    sellingPointElements: [],
    visualImpactLevel: "medium" as const,
    imageClarityLevel: "medium" as const,
    unknownFields: [],
    warnings: [],
    confidence: "medium" as const
  };

  if (includesAnyKeyword(text, ["狗", "宠物", "牵引绳", "背带", "pet", "dog", "leash", "harness"])) {
    return {
      ...baseResult,
      productType: "宠物牵引用品",
      category: "宠物用品",
      mainColors: ["黑色", "橙色"],
      productStructure: "single",
      standardizationLevel: "semi_standard",
      usageScenes: ["户外遛狗", "宠物出行"],
      targetUsers: ["养狗人群", "宠物主人"],
      clickPotentialFactors: ["产品主体清晰", "使用场景明确", "有组合延展空间"]
    };
  }

  if (includesAnyKeyword(text, ["戒指", "项链", "饰品", "jewelry", "ring", "necklace"])) {
    return {
      ...baseResult,
      productType: "饰品",
      category: "饰品",
      mainColors: ["金色", "银色"],
      productStructure: "single",
      standardizationLevel: "semi_standard",
      usageScenes: ["日常穿搭", "礼物场景"],
      targetUsers: ["女性用户", "穿搭用户"],
      clickPotentialFactors: ["颜色醒目", "款式有延展空间", "适合多件套组合"]
    };
  }

  if (includesAnyKeyword(text, ["服装", "女装", "男装", "bra", "underwear", "clothing", "dress", "shirt"])) {
    return {
      ...baseResult,
      productType: "服饰",
      category: product.category || "服饰",
      mainColors: ["基础色", "流行色"],
      productStructure: "single",
      standardizationLevel: "non_standard",
      usageScenes: ["日常穿搭", "场景化穿搭"],
      targetUsers: ["服饰消费人群"],
      clickPotentialFactors: ["款式影响点击", "图片表达影响转化"]
    };
  }

  return {
    ...baseResult,
    productType: product.category || "待识别产品",
    category: product.category || "待补充类目",
    mainColors: ["未知"],
    productStructure: "single",
    standardizationLevel: "unknown",
    usageScenes: ["待补充"],
    targetUsers: ["待补充"],
    clickPotentialFactors: ["需要补充更完整图片素材"]
  };
}

function getDataCompleteness(product: ProductInput): DataCompleteness {
  const hasImage = Boolean(product.imageFileName || product.imageUrl || product.images?.length);
  const hasWeeklySales = typeof product.weeklySales === "number";
  const hasMonthlySales = typeof product.monthlySales === "number";
  const hasRating = typeof product.rating === "number";
  const hasReviews = Boolean(product.reviewsText?.trim());
  const missingFields: string[] = [];

  if (!hasImage) missingFields.push("产品图片");
  if (!hasWeeklySales) missingFields.push("周销量");
  if (!hasMonthlySales) missingFields.push("月销量");
  if (!hasRating) missingFields.push("商品评分");
  if (!hasReviews) missingFields.push("评论内容");

  return {
    hasImage,
    hasTitle: Boolean(product.title.trim()),
    hasCategory: Boolean(product.category.trim()),
    hasPrice: product.price > 0,
    hasWeeklySales,
    hasMonthlySales,
    hasRating,
    hasReviews,
    missingFields,
    confidenceImpact: missingFields.length >= 4 ? "high" : missingFields.length >= 2 ? "medium" : "low"
  };
}

function getScoringFlags(type: RecommendationDirectionType) {
  return {
    hasBundle: type === "bundle",
    hasUpgrade: type === "upgrade" || type === "function_difference",
    hasSceneSegment: type === "scene_segment",
    hasUserSegment: type === "user_segment",
    hasImageExpression: type === "image_expression",
    hasReviewPainPoint: type === "review_pain_point"
  };
}

function applyScores(
  recommendations: RecommendationDirection[],
  product: ProductInput,
  imageRecognition: ImageRecognitionResult,
  hotProductFactors: AnalysisReport["hotProductAnalysis"]["possibleWinningFactors"],
  directCopyRisk: AnalysisReport["directCopyRisk"]
): RecommendationDirection[] {
  return recommendations.map((recommendation) => {
    const scoringResult = calculateRecommendationScore({
      directionType: recommendation.type,
      productStructure: imageRecognition.productStructure,
      standardizationLevel: imageRecognition.standardizationLevel,
      hotProductFactors,
      directCopyRisk,
      hasWeeklySales: typeof product.weeklySales === "number",
      hasMonthlySales: typeof product.monthlySales === "number",
      hasRating: typeof product.rating === "number",
      hasReviews: Boolean(product.reviewsText?.trim()),
      ...getScoringFlags(recommendation.type)
    });

    return {
      ...recommendation,
      score: scoringResult.score,
      level: scoringResult.level
    };
  });
}

function getFinalConclusion(recommendations: RecommendationDirection[]): string {
  const highestScore = Math.max(
    0,
    ...recommendations.map((recommendation) => recommendation.score.finalRecommendationScore)
  );

  if (highestScore >= 80) {
    return "当前产品具备可迁移元素，建议优先测试高分差异化方向，但不建议直接复制同款。";
  }

  if (highestScore >= 60) {
    return "当前产品存在一定测试价值，建议小批量测试，并优先选择比价风险较低的方向。";
  }

  return "当前产品方向需要谨慎，建议补充更多销量、评论或图片信息后再判断。";
}

function createMockPreGenerationReport(product: ProductInput): AnalysisReport["preGenerationReport"] {
  const productName = product.title || "待补充产品名称";
  const productCategory = product.category || "待补充类目";
  const hasImages = Boolean(product.images?.length || product.imageFileName || product.imageUrl);
  const planA = {
    combinationName: `${productName} 场景组合优先测试方案`,
    combinationContent: "主产品 + 相关配件 + 场景化使用补充件",
    targetUsers: "对该类目有明确需求的 TEMU 用户",
    usageScene: "商品主图和详情页中可以清楚表达的核心使用场景",
    coreSellingPoints: "突出组合价值、使用便利性和场景完整度，不夸大产品功能。",
    whyPriorityTest: "该方案不是直接复制单品，而是通过组合内容提高图片表达空间，适合作为第一轮小批量测试方向。",
    suitableImageTypes: "组合平铺图、使用场景图、配件关系图、卖点聚焦图、主图风格图"
  };
  const planB = {
    combinationName: `${productName} 升级备选方案`,
    combinationContent: "主产品 + 规格/颜色/配件升级方向",
    targetUsers: "愿意为更完整使用体验付费的用户",
    usageScene: "需要更强场景表达或更清晰卖点的使用场景",
    coreSellingPoints: "突出升级点和使用场景，但不写未经确认的认证、材质、承重、尺寸或数据。",
    whenToTry: "当方案 A 素材不足、供应链不稳定或测试反馈一般时尝试。",
    notes: "需要先确认供应链是否能稳定提供升级配件或对应规格。"
  };
  const imagePackageBase = {
    productName,
    productCategory,
    recommendedCombinationPlan: planA.combinationName,
    combinationContent: planA.combinationContent,
    targetUsers: planA.targetUsers,
    usageScene: planA.usageScene,
    coreSellingPoints: planA.coreSellingPoints,
    referenceImages: hasImages ? "已上传" : "待上传",
    imageCount: "5 张",
    imageRatio: "1:1 正方形",
    imageStyle: "干净、清晰、有电商销售感，适合 TEMU 平台",
    restrictions: "不要出现品牌词，不要夸大功能，不要改变产品主体结构，不要生成产品没有的功能"
  };
  const titlePackageBase = {
    productName,
    productCategory,
    combinationPlan: planA.combinationName,
    productImages: hasImages ? "已上传" : "待上传",
    targetPlatform: "TEMU",
    outputRequirements: ["3 个 TEMU 商品标题", "推荐使用的标题", "5 个核心卖点", "5 张图对应短文案", "详情页简短描述"],
    fixedRequirements: [
      "不要出现品牌词",
      "不要出现未经确认的认证、材质、承重、尺寸、数据",
      "不要夸大产品功能",
      "不要写虚假效果",
      "标题要简洁、清楚，适合电商平台",
      "如果是组合产品，要突出组合价值和使用场景"
    ]
  };

  return {
    productBasics: {
      productName,
      productCategory,
      currentComposition: "主产品为核心，配件关系需要根据上传图片和供应链素材进一步确认。",
      mainUse: "满足用户在对应场景下的基础使用需求。",
      targetUsers: "对该类目有明确购买需求的 TEMU 用户。",
      usageScenes: "以商品主图、详情图和上传素材中可见场景为准。"
    },
    packagingValue: {
      worthPackaging: "待观察",
      productType: "半标品",
      priceComparisonRisk: "中",
      transformationSpace: "中",
      imageExpressionSpace: "中",
      oneSentenceJudgment: "当前产品可以先围绕组合、配件和场景表达做小范围测试，但不代表最终上架建议。"
    },
    planA,
    planB,
    priorityAdvice: "建议优先执行方案 A。",
    materialChecklist: [
      { materialType: "主产品图", requirement: "必须", usage: "用于生成套装主图。" },
      { materialType: "配件图", requirement: "必须，如果有组合配件", usage: "用于展示组合内容和套装价值。" },
      { materialType: "产品细节图", requirement: "建议", usage: "用于展示扣具、结构、细节、做工等。" },
      { materialType: "规格/尺码图", requirement: "建议，部分品类必须", usage: "用于生成规格图、尺寸图、尺码说明图。" },
      { materialType: "包装/重量信息截图", requirement: "建议", usage: "用于辅助核价和规格表达。" },
      { materialType: "颜色/款式图", requirement: "可选", usage: "用于展示可选颜色、款式或尺码。" }
    ],
    imageGenerationPackage: {
      ...imagePackageBase,
      copyText: [
        "请根据以下资料生成 TEMU 商品图：",
        `产品名称：${imagePackageBase.productName}`,
        `产品类目：${imagePackageBase.productCategory}`,
        `推荐组合方案：${imagePackageBase.recommendedCombinationPlan}`,
        `组合内容：${imagePackageBase.combinationContent}`,
        `目标人群：${imagePackageBase.targetUsers}`,
        `使用场景：${imagePackageBase.usageScene}`,
        `核心卖点：${imagePackageBase.coreSellingPoints}`,
        `参考图片：${imagePackageBase.referenceImages}`,
        `生成图片数量：${imagePackageBase.imageCount}`,
        `图片比例：${imagePackageBase.imageRatio}`,
        `图片风格：${imagePackageBase.imageStyle}`,
        "规格信息：",
        ...formatSpecsLines(product),
        `禁止事项：${imagePackageBase.restrictions}`,
        "固定要求：如果有规格信息，请生成一张规格/尺码说明图；如果规格信息不完整，不要编造尺寸、重量、材质、承重或认证数据。",
        "第 5 张图建议为规格/细节图，优先展示规格、尺寸、尺码、配件清单；如果规格信息不足，则只展示真实可见的产品细节，不要编造数据。"
      ].join("\n")
    },
    titleSellingPointPackage: {
      ...titlePackageBase,
      copyText: [
        "请根据以下资料生成 TEMU 商品标题和卖点：",
        `产品名称：${titlePackageBase.productName}`,
        `产品类目：${titlePackageBase.productCategory}`,
        `组合方案：${titlePackageBase.combinationPlan}`,
        `产品图片 / AI 生成图：${titlePackageBase.productImages}`,
        `目标平台：${titlePackageBase.targetPlatform}`,
        "输出要求：",
        ...titlePackageBase.outputRequirements.map((item) => `- ${item}`),
        "固定要求：",
        ...titlePackageBase.fixedRequirements.map((item) => `- ${item}`)
      ].join("\n")
    },
    boundaryReminder: "本报告只提供产品包装方向、组合建议、素材准备和 AI 图文生成资料，不代表最终上架建议。供货能力、真实成本、物流费用和利润结果，请卖家自行确认。"
  };
}

export function generateMockAnalysisReport(product: ProductInput): AnalysisReport {
  const imageRecognition = createMockImageRecognition(product);
  const dataCompleteness = getDataCompleteness(product);
  const hotProductAnalysis = analyzeHotProductFactors({ product, imageRecognition });
  const directCopyRisk = analyzePriceComparisonRisk({
    standardizationLevel: imageRecognition.standardizationLevel,
    productStructure: imageRecognition.productStructure,
    isEasilyFoundOn1688: imageRecognition.standardizationLevel === "standard",
    isLowCostEasyCopy: imageRecognition.standardizationLevel === "standard" && product.price <= 10,
    hasBundle: imageRecognition.productStructure === "bundle" || imageRecognition.productStructure === "multi_pack",
    hasFunctionUpgrade: false,
    hasSceneChange: imageRecognition.usageScenes.length > 0,
    hasUserSegment: imageRecognition.targetUsers.length > 0,
    hasColorDifference: imageRecognition.mainColors.length > 1
  });
  const recommendations = generateRecommendationDirections({
    product,
    imageRecognition,
    hotProductAnalysis,
    directCopyRisk,
    mode: "default"
  });
  const scoredRecommendations = applyScores(
    recommendations,
    product,
    imageRecognition,
    hotProductAnalysis.possibleWinningFactors,
    directCopyRisk
  ).sort((current, next) => next.score.finalRecommendationScore - current.score.finalRecommendationScore);

  return {
    input: product,
    dataCompleteness,
    imageRecognition,
    hotProductAnalysis,
    directCopyRisk,
    recommendations: scoredRecommendations,
    finalConclusion: getFinalConclusion(scoredRecommendations),
    preGenerationReport: createMockPreGenerationReport(product),
    actionSuggestions: [
      "不建议直接复制同款。",
      "优先选择组合、升级、场景细分等差异化方向。",
      "准备 1688 主产品图、配件图、细节图、规格/尺码图和包装/重量信息截图后，再进行 AI 图文生成。",
      "如果缺少评论和销量，建议补充数据后重新分析。",
      "本报告只做图文生成前置准备，不代表最终上架建议。"
    ]
  };
}
