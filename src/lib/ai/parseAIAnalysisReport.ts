import { validateAndPolishAIReport } from "@/lib/ai/validateAIReport";
import type { AIAnalysisRawOutput, AIPreGenerationRawOutput } from "@/types/ai";
import type {
  ConfidenceLevel,
  HotProductFactorType,
  PriceComparisonRiskLevel
} from "@/types/analysis";
import type {
  DataCompleteness,
  ProductInput,
  ProductStructure,
  StandardizationLevel
} from "@/types/product";
import type {
  AnalysisReport,
  BackupCombinationPlan,
  ImageGenerationPackage,
  MaterialChecklistItem,
  PackagingLevel,
  PackagingProductType,
  PackagingValueReport,
  PackagingWorth,
  PreGenerationReport,
  PrimaryCombinationPlan,
  ProductBasicsReport,
  RecommendationDirectionType,
  RecommendationLevel,
  SkuConversionImpact,
  SkuDependencyLevel,
  TitleSellingPointPackage
} from "@/types/recommendation";

type ParseAIAnalysisReportParams = {
  product: ProductInput;
  rawText: string;
};

const confidenceLevels = ["low", "medium", "high", "unknown"] as const;
const hotProductFactorTypes = ["price", "color", "style", "image_click_rate", "comprehensive", "unknown"] as const;
const productStructures = ["single", "bundle", "multi_pack", "unknown"] as const;
const standardizationLevels = ["standard", "semi_standard", "non_standard", "unknown"] as const;
const riskLevels = ["low", "medium", "high", "unknown"] as const;
const recommendationTypes = ["bundle", "upgrade", "scene_segment", "user_segment", "function_difference", "review_pain_point", "image_expression", "cautious"] as const;
const recommendationLevels = ["priority_test", "small_batch_test", "cautious", "not_recommended"] as const;
const packagingWorthValues = ["值得", "待观察", "不建议"] as const;
const packagingProductTypeValues = ["标品", "半标品", "非标品", "混合型"] as const;
const packagingLevelValues = ["低", "中", "高"] as const;
const skuDependencyValues = ["强依赖", "中等依赖", "弱依赖", "不适用"] as const;
const skuConversionImpactValues = ["高", "中", "低", "不适用"] as const;
const materialRequirementValues = ["必须", "必须，如果有组合配件", "建议", "建议，部分品类必须", "可选"] as const;

const boundaryReminder = "本报告只提供产品包装方向、组合建议、素材准备和 AI 图文生成资料，不代表最终上架建议。供货能力、真实成本、物流费用和利润结果，请卖家自行确认。";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function cleanAIJsonText(rawText: string): string {
  const withoutFence = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const firstBrace = withoutFence.indexOf("{");
  const lastBrace = withoutFence.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("AI 返回内容中未找到 JSON 对象。");
  }

  return withoutFence.slice(firstBrace, lastBrace + 1);
}

function parseRawOutput(rawText: string): AIAnalysisRawOutput {
  try {
    const parsed = JSON.parse(cleanAIJsonText(rawText)) as unknown;

    if (!isRecord(parsed)) {
      throw new Error("AI JSON 根节点不是对象。");
    }

    return parsed as AIAnalysisRawOutput;
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知解析错误";
    throw new Error(`AI 返回内容解析失败：${message}`);
  }
}

function sanitizeText(value: string): string {
  return value
    .replace(/一定能通过核价/g, "不代表一定通过核价")
    .replace(/一定能爆/g, "需要进一步验证")
    .replace(/保证能卖/g, "不承诺销售结果")
    .replace(/保证通过/g, "不承诺通过")
    .replace(/百分百/g, "需要进一步验证")
    .replace(/必然爆/g, "可能有机会")
    .replace(/必爆/g, "可能有机会")
    .replace(/必过/g, "不代表一定通过")
    .replace(/必然/g, "可能")
    .replace(/绝对/g, "相对")
    .replace(/保证/g, "建议验证")
    .replace(/一定/g, "可能");
}

function pickString(value: unknown, fallback: string): string {
  return sanitizeText(typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback);
}

function isMeaningfulText(value: string | undefined): value is string {
  if (!value) return false;

  const normalized = value.trim().toLowerCase();
  const invalidValues = new Set([
    "",
    "-",
    "--",
    "n/a",
    "na",
    "null",
    "undefined",
    "unknown",
    "待补充",
    "待补充产品名称",
    "待补充类目",
    "未知",
    "未识别",
    "未提供",
    "无"
  ]);

  return !invalidValues.has(normalized);
}

function pickMeaningfulString(...values: Array<string | undefined>): string {
  const matchedValue = values.find(isMeaningfulText);
  return sanitizeText(matchedValue?.trim() || "未提供");
}

function pickOptionalMeaningfulString(...values: Array<string | undefined>): string | undefined {
  const matchedValue = values.find(isMeaningfulText);
  return matchedValue ? sanitizeText(matchedValue.trim()) : undefined;
}

function pickStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .map((item) => sanitizeText(item.trim()))
    : [];
}

function pickNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clampScore(value: unknown, fallback: number): number {
  return Math.min(100, Math.max(0, Math.round(pickNumber(value, fallback))));
}

function pickEnum<T extends readonly string[]>(value: unknown, allowedValues: T, fallback: T[number]): T[number] {
  return typeof value === "string" && (allowedValues as readonly string[]).includes(value) ? value : fallback;
}

function formatProductName(product: ProductInput): string {
  return pickMeaningfulString(product.title, product.cleanedProductName, product.rawRecognizedTitle);
}

function formatProductCategory(product: ProductInput): string {
  return pickMeaningfulString(product.category);
}

function inferSkuAssessment(product: ProductInput): Pick<
  PackagingValueReport,
  "skuDependency" | "currentSkuInfo" | "skuConversionImpact" | "skuSuggestion"
> {
  const source = `${product.title} ${product.category} ${product.cleanedProductName ?? ""}`.toLowerCase();
  const specs = product.productSpecs;
  const skuInfo = [
    specs?.colorSizeOptions ? `颜色/尺码选项：${specs.colorSizeOptions}` : "",
    specs?.mainProductSpec ? `主产品规格：${specs.mainProductSpec}` : "",
    specs?.productSize ? `产品尺寸：${specs.productSize}` : ""
  ].filter(Boolean).join("；") || "未提供";
  const strongSkuKeywords = [
    "dog harness",
    "harness",
    "pet wearable",
    "clothing",
    "dress",
    "shirt",
    "shoes",
    "hat",
    "bra",
    "underwear",
    "ring",
    "necklace",
    "bracelet",
    "狗背带",
    "宠物穿戴",
    "服装",
    "女装",
    "男装",
    "鞋",
    "帽",
    "内衣",
    "文胸",
    "饰品",
    "戒指",
    "项链"
  ];
  const mediumSkuKeywords = [
    "leash",
    "collar",
    "bag",
    "bottle",
    "storage",
    "capacity",
    "model",
    "牵引绳",
    "项圈",
    "包",
    "水杯",
    "收纳",
    "容量",
    "型号",
    "规格"
  ];

  if (strongSkuKeywords.some((keyword) => source.includes(keyword))) {
    return {
      skuDependency: "强依赖",
      currentSkuInfo: skuInfo,
      skuConversionImpact: skuInfo === "未提供" ? "中" : "高",
      skuSuggestion: skuInfo === "未提供"
        ? "该品类通常依赖颜色、尺码或规格选项，建议补充可选颜色、尺码、型号或适用对象信息。"
        : "当前 SKU 信息可用于判断颜色/尺码丰富度和图文表达方向，建议核对是否覆盖主流选择。"
    };
  }

  if (mediumSkuKeywords.some((keyword) => source.includes(keyword))) {
    return {
      skuDependency: "中等依赖",
      currentSkuInfo: skuInfo,
      skuConversionImpact: skuInfo === "未提供" ? "低" : "中",
      skuSuggestion: skuInfo === "未提供"
        ? "可根据实际产品补充规格、容量、型号、颜色或适用对象，但不应强行编造。"
        : "已有 SKU 或规格信息可作为详情图和规格图参考。"
    };
  }

  return {
    skuDependency: "弱依赖",
    currentSkuInfo: skuInfo,
    skuConversionImpact: skuInfo === "未提供" ? "不适用" : "低",
    skuSuggestion: skuInfo === "未提供"
      ? "该类产品未必依赖多颜色或多尺码，不应因缺少颜色/尺码选项直接判断为缺陷。"
      : "可保留已提供规格信息用于图文资料，但无需强行生成颜色/尺码图。"
  };
}

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
function createCopyText(lines: string[]): string {
  return lines.join("\n");
}

function createDataCompleteness(product: ProductInput): DataCompleteness {
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

  const optionalMissingCount = [hasWeeklySales, hasMonthlySales, hasRating, hasReviews].filter((item) => !item).length;

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
    confidenceImpact: optionalMissingCount >= 3 ? "high" : optionalMissingCount > 0 ? "medium" : "low"
  };
}

function mapImageRecognition(raw: AIAnalysisRawOutput["imageRecognition"], product: ProductInput) {
  return {
    productType: pickString(raw?.productType, product.category || "unknown"),
    category: pickString(raw?.category, product.category || "unknown"),
    mainColors: pickStringArray(raw?.mainColors),
    secondaryColors: pickStringArray(raw?.secondaryColors),
    styleDescription: pickString(raw?.styleDescription, "unknown"),
    productStructure: pickEnum(raw?.productStructure, productStructures, "unknown") as ProductStructure,
    standardizationLevel: pickEnum(raw?.standardizationLevel, standardizationLevels, "unknown") as StandardizationLevel,
    visibleAccessories: pickStringArray(raw?.visibleAccessories),
    usageScenes: pickStringArray(raw?.usageScenes),
    targetUsers: pickStringArray(raw?.targetUsers),
    imageStyle: pickString(raw?.imageStyle, "unknown"),
    clickPotentialFactors: pickStringArray(raw?.clickPotentialFactors),
    sellingPointElements: pickStringArray(raw?.sellingPointElements),
    unknownFields: pickStringArray(raw?.unknownFields),
    warnings: [],
    confidence: "medium" as ConfidenceLevel
  };
}

function mapHotProductAnalysis(raw: AIAnalysisRawOutput["hotProductAnalysis"]) {
  return {
    hotProductType: pickEnum(raw?.hotProductType, hotProductFactorTypes, "unknown") as HotProductFactorType,
    possibleWinningFactors: Array.isArray(raw?.possibleWinningFactors)
      ? raw.possibleWinningFactors.map((factor) => ({
          factor: pickEnum(factor?.factor, hotProductFactorTypes, "unknown") as HotProductFactorType,
          confidence: pickEnum(factor?.confidence, confidenceLevels, "unknown") as ConfidenceLevel,
          reason: pickString(factor?.reason, "当前数据不足，需要进一步验证。")
        }))
      : [],
    unknownFactors: pickStringArray(raw?.unknownFactors),
    confidence: pickEnum(raw?.confidence, confidenceLevels, "unknown") as ConfidenceLevel,
    notes: pickStringArray(raw?.notes)
  };
}

function mapDirectCopyRisk(raw: AIAnalysisRawOutput["directCopyRisk"]) {
  return {
    riskLevel: pickEnum(raw?.riskLevel, riskLevels, "unknown") as PriceComparisonRiskLevel,
    riskScore: clampScore(raw?.riskScore, 60),
    reasons: pickStringArray(raw?.reasons),
    riskWarnings: pickStringArray(raw?.riskWarnings),
    riskReductionSuggestions: pickStringArray(raw?.riskReductionSuggestions)
  };
}

function mapRecommendations(raw: AIAnalysisRawOutput["recommendations"]) {
  return (Array.isArray(raw) ? raw : []).slice(0, 3).map((recommendation, index) => {
    const salesPotentialScore = clampScore(recommendation.salesPotentialScore, 60);
    const priceApprovalScore = clampScore(recommendation.priceApprovalScore, 60);
    const finalRecommendationScore = clampScore(recommendation.finalRecommendationScore, 60);

    return {
      id: `ai-recommendation-${index + 1}`,
      type: pickEnum(recommendation.type, recommendationTypes, "cautious") as RecommendationDirectionType,
      title: pickString(recommendation.title, `差异化方向 ${index + 1}`),
      productIdea: pickString(recommendation.productIdea, "建议补充更多商品信息后再细化方案。"),
      reason: pickString(recommendation.reason, "当前方向需要进一步验证。"),
      relatedWinningFactors: pickStringArray(recommendation.relatedWinningFactors),
      howItReducesPriceComparisonRisk: pickString(recommendation.howItReducesPriceComparisonRisk, "通过组合、升级或场景变化，有助于相对降低直接同款比价风险。"),
      whyItStillHasSalesPotential: pickString(recommendation.whyItStillHasSalesPotential, "该方向保留了原产品的部分需求逻辑，但仍需测试验证。"),
      potentialRisks: pickStringArray(recommendation.potentialRisks),
      score: {
        salesPotentialScore,
        priceApprovalScore,
        finalRecommendationScore,
        confidence: "medium" as ConfidenceLevel,
        scoreReasons: ["分数来自 AI 结构化输出，已限制在 0-100 范围内。"]
      },
      level: pickEnum(recommendation.level, recommendationLevels, "small_batch_test") as RecommendationLevel
    };
  });
}

function mapMaterialChecklist(raw: AIPreGenerationRawOutput["materialChecklist"]): MaterialChecklistItem[] {
  const fallback: MaterialChecklistItem[] = [
    { materialType: "主产品图", requirement: "必须", usage: "用于生成套装主图。" },
    { materialType: "配件图", requirement: "必须，如果有组合配件", usage: "用于展示组合内容和套装价值。" },
    { materialType: "产品细节图", requirement: "建议", usage: "用于展示扣具、结构、细节、做工等。" },
    { materialType: "规格/尺码图", requirement: "建议，部分品类必须", usage: "用于生成规格图、尺寸图、尺码说明图。" },
    { materialType: "包装/重量信息截图", requirement: "建议", usage: "用于辅助核价和规格表达。" },
    { materialType: "颜色/款式图", requirement: "可选", usage: "用于展示可选颜色、款式或尺码。" }
  ];

  if (!Array.isArray(raw) || raw.length === 0) return fallback;

  return raw.slice(0, 6).map((item, index) => ({
    materialType: pickString(item.materialType, fallback[index]?.materialType ?? "参考素材"),
    requirement: pickEnum(item.requirement, materialRequirementValues, fallback[index]?.requirement ?? "建议"),
    usage: pickString(item.usage, fallback[index]?.usage ?? "用于辅助生成图文资料。")
  }));
}

function buildImagePackageCopyText(pkg: Omit<ImageGenerationPackage, "copyText">, product?: ProductInput): string {
  return createCopyText([
    "请根据以下资料生成 TEMU 商品图：",
    `产品名称：${pkg.productName}`,
    `产品类目：${pkg.productCategory}`,
    `推荐组合方案：${pkg.recommendedCombinationPlan}`,
    `组合内容：${pkg.combinationContent}`,
    `目标人群：${pkg.targetUsers}`,
    `使用场景：${pkg.usageScene}`,
    `核心卖点：${pkg.coreSellingPoints}`,
    `参考图片：${pkg.referenceImages}`,
    `生成图片数量：${pkg.imageCount}`,
    `图片比例：${pkg.imageRatio}`,
    `图片风格：${pkg.imageStyle}`,
    "规格信息：",
    ...(product ? formatSpecsLines(product) : ["主产品规格：未提供", "配件规格：未提供", "产品尺寸：未提供", "包装重量：未提供", "包装尺寸：未提供", "颜色/尺码选项：未提供"]),
    `禁止事项：${pkg.restrictions}`,
    "固定要求：如果有规格信息，请生成一张规格/尺码说明图；如果规格信息不完整，不要编造尺寸、重量、材质、承重或认证数据。",
    "第 5 张图建议为规格/细节图，优先展示规格、尺寸、尺码、配件清单；如果规格信息不足，则只展示真实可见的产品细节，不要编造数据。"
  ]);
}

function buildTitlePackageCopyText(pkg: Omit<TitleSellingPointPackage, "copyText">): string {
  return createCopyText([
    "请根据以下资料生成 TEMU 商品标题和卖点：",
    `产品名称：${pkg.productName}`,
    `产品类目：${pkg.productCategory}`,
    `组合方案：${pkg.combinationPlan}`,
    `产品图片 / AI 生成图：${pkg.productImages}`,
    `目标平台：${pkg.targetPlatform}`,
    "输出要求：",
    ...pkg.outputRequirements.map((item) => `- ${item}`),
    "固定要求：",
    ...pkg.fixedRequirements.map((item) => `- ${item}`)
  ]);
}

function createDefaultPreGenerationReport(product: ProductInput): PreGenerationReport {
  const productName = formatProductName(product);
  const productCategory = formatProductCategory(product);
  const skuAssessment = inferSkuAssessment(product);
  const planA: PrimaryCombinationPlan = {
    combinationName: `${productName} 场景组合优先测试方案`,
    combinationContent: `主产品 1 件 + 需去 1688 确认的轻量配件 1-2 件。优先搜索：${productName} 配件、${productName} 收纳袋、${productName} 防尘罩、${productName} 绑带、${productName} 替换件。配件作用：补齐使用场景、提升套装价值，但不要明显增加体积重量。`,
    targetUsers: "对该产品已有明确需求的人群",
    usageScene: "日常使用、礼物场景或平台主图可表达的核心使用场景",
    coreSellingPoints: "围绕具体配件带来的套装价值、使用便利性和场景完整度表达，不夸大产品功能。",
    whyPriorityTest: "建议先测试轻量配件组合，因为采购和包装复杂度相对更低。需要确认：配件单价、组合后重量、包装尺寸、供应商是否能稳定配齐、是否会增加售后风险。",
    suitableImageTypes: "组合平铺图、使用场景图、配件清单图、卖点聚焦图、主图风格图。不建议第一轮加入：大型桌子、遮阳伞、厚重垫子，原因是可能增加成本、体积重量和履约复杂度。"
  };
  const planB: BackupCombinationPlan = {
    combinationName: `${productName} 升级备选方案`,
    combinationContent: `主产品 1 件 + 需去 1688 确认的升级配件 1 件。优先搜索：${productName} 升级款、${productName} 加厚配件、${productName} 替换件、${productName} 收纳包、${productName} 套装。配件作用：强化规格、收纳、保护或使用便利性。`,
    targetUsers: "愿意为更完整使用体验付费的用户",
    usageScene: "需要更清晰卖点或更强场景表达的使用场景",
    coreSellingPoints: "突出具体升级配件带来的使用价值和场景价值，但不写未经确认的认证、材质、承重、尺寸或数据。",
    whenToTry: "当方案 A 素材不足、供应链不稳定或测试反馈一般，且供应商能稳定提供升级配件时再尝试。",
    notes: "需要确认升级配件成本、重量、包装尺寸、交期、是否容易破损、是否增加退货售后。不建议第一轮加入：大尺寸地垫、厚重垫子、大型桌面类配件，原因是可能提高物流成本和履约难度。"
  };
  const imagePackageBase = {
    productName,
    productCategory,
    recommendedCombinationPlan: planA.combinationName,
    combinationContent: planA.combinationContent,
    targetUsers: planA.targetUsers,
    usageScene: planA.usageScene,
    coreSellingPoints: planA.coreSellingPoints,
    referenceImages: product.images?.length ? "已上传" : "待上传",
    imageCount: "5 张",
    imageRatio: "1:1 正方形",
    imageStyle: "干净、清晰、有电商销售感，适合 TEMU 平台",
    restrictions: "不要出现品牌词，不要夸大功能，不要改变产品主体结构，不要生成产品没有的功能"
  };
  const titlePackageBase = {
    productName,
    productCategory,
    combinationPlan: planA.combinationName,
    productImages: product.images?.length ? "已上传" : "待上传",
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
      rawRecognizedTitle: product.rawRecognizedTitle,
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
      skuDependency: skuAssessment.skuDependency,
      currentSkuInfo: skuAssessment.currentSkuInfo,
      skuConversionImpact: skuAssessment.skuConversionImpact,
      skuSuggestion: skuAssessment.skuSuggestion,
      oneSentenceJudgment: "当前产品可以先围绕组合、配件和场景表达做小范围测试，但不代表最终上架建议。"
    },
    planA,
    planB,
    priorityAdvice: "建议优先执行方案 A。",
    materialChecklist: mapMaterialChecklist(undefined),
    imageGenerationPackage: {
      ...imagePackageBase,
      copyText: buildImagePackageCopyText(imagePackageBase, product)
    },
    titleSellingPointPackage: {
      ...titlePackageBase,
      copyText: buildTitlePackageCopyText(titlePackageBase)
    },
    boundaryReminder
  };
}

function mapPreGenerationReport(raw: AIPreGenerationRawOutput | undefined, product: ProductInput): PreGenerationReport {
  const fallback = createDefaultPreGenerationReport(product);
  const productBasics: ProductBasicsReport = {
    rawRecognizedTitle: pickOptionalMeaningfulString(product.rawRecognizedTitle, pickString(raw?.productBasics?.rawRecognizedTitle, "")),
    productName: pickMeaningfulString(
      product.title,
      product.cleanedProductName,
      product.rawRecognizedTitle,
      pickString(raw?.productBasics?.productName, ""),
      fallback.productBasics.productName
    ),
    productCategory: pickMeaningfulString(
      product.category,
      pickString(raw?.productBasics?.productCategory, ""),
      fallback.productBasics.productCategory
    ),
    currentComposition: pickString(raw?.productBasics?.currentComposition, fallback.productBasics.currentComposition),
    mainUse: pickString(raw?.productBasics?.mainUse, fallback.productBasics.mainUse),
    targetUsers: pickString(raw?.productBasics?.targetUsers, fallback.productBasics.targetUsers),
    usageScenes: pickString(raw?.productBasics?.usageScenes, fallback.productBasics.usageScenes)
  };
  const packagingValue: PackagingValueReport = {
    worthPackaging: pickEnum(raw?.packagingValue?.worthPackaging, packagingWorthValues, fallback.packagingValue.worthPackaging) as PackagingWorth,
    productType: pickEnum(raw?.packagingValue?.productType, packagingProductTypeValues, fallback.packagingValue.productType) as PackagingProductType,
    priceComparisonRisk: pickEnum(raw?.packagingValue?.priceComparisonRisk, packagingLevelValues, fallback.packagingValue.priceComparisonRisk) as PackagingLevel,
    transformationSpace: pickEnum(raw?.packagingValue?.transformationSpace, packagingLevelValues, fallback.packagingValue.transformationSpace) as PackagingLevel,
    imageExpressionSpace: pickEnum(raw?.packagingValue?.imageExpressionSpace, packagingLevelValues, fallback.packagingValue.imageExpressionSpace) as PackagingLevel,
    skuDependency: pickEnum(raw?.packagingValue?.skuDependency, skuDependencyValues, fallback.packagingValue.skuDependency) as SkuDependencyLevel,
    currentSkuInfo: pickString(raw?.packagingValue?.currentSkuInfo, fallback.packagingValue.currentSkuInfo),
    skuConversionImpact: pickEnum(raw?.packagingValue?.skuConversionImpact, skuConversionImpactValues, fallback.packagingValue.skuConversionImpact) as SkuConversionImpact,
    skuSuggestion: pickString(raw?.packagingValue?.skuSuggestion, fallback.packagingValue.skuSuggestion),
    oneSentenceJudgment: pickString(raw?.packagingValue?.oneSentenceJudgment, fallback.packagingValue.oneSentenceJudgment)
  };
  const planA: PrimaryCombinationPlan = {
    combinationName: pickString(raw?.planA?.combinationName, fallback.planA.combinationName),
    combinationContent: pickString(raw?.planA?.combinationContent, fallback.planA.combinationContent),
    targetUsers: pickString(raw?.planA?.targetUsers, fallback.planA.targetUsers),
    usageScene: pickString(raw?.planA?.usageScene, fallback.planA.usageScene),
    coreSellingPoints: pickString(raw?.planA?.coreSellingPoints, fallback.planA.coreSellingPoints),
    whyPriorityTest: pickString(raw?.planA?.whyPriorityTest, fallback.planA.whyPriorityTest),
    suitableImageTypes: pickString(raw?.planA?.suitableImageTypes, fallback.planA.suitableImageTypes)
  };
  const planB: BackupCombinationPlan = {
    combinationName: pickString(raw?.planB?.combinationName, fallback.planB.combinationName),
    combinationContent: pickString(raw?.planB?.combinationContent, fallback.planB.combinationContent),
    targetUsers: pickString(raw?.planB?.targetUsers, fallback.planB.targetUsers),
    usageScene: pickString(raw?.planB?.usageScene, fallback.planB.usageScene),
    coreSellingPoints: pickString(raw?.planB?.coreSellingPoints, fallback.planB.coreSellingPoints),
    whenToTry: pickString(raw?.planB?.whenToTry, fallback.planB.whenToTry),
    notes: pickString(raw?.planB?.notes, fallback.planB.notes)
  };
  const materialChecklist = mapMaterialChecklist(raw?.materialChecklist);
  const imagePackageBase = {
    productName: pickString(raw?.imageGenerationPackage?.productName, productBasics.productName),
    productCategory: pickString(raw?.imageGenerationPackage?.productCategory, productBasics.productCategory),
    recommendedCombinationPlan: pickString(raw?.imageGenerationPackage?.recommendedCombinationPlan, planA.combinationName),
    combinationContent: pickString(raw?.imageGenerationPackage?.combinationContent, planA.combinationContent),
    targetUsers: pickString(raw?.imageGenerationPackage?.targetUsers, planA.targetUsers),
    usageScene: pickString(raw?.imageGenerationPackage?.usageScene, planA.usageScene),
    coreSellingPoints: pickString(raw?.imageGenerationPackage?.coreSellingPoints, planA.coreSellingPoints),
    referenceImages: pickString(raw?.imageGenerationPackage?.referenceImages, product.images?.length ? "已上传" : "待上传"),
    imageCount: pickString(raw?.imageGenerationPackage?.imageCount, "5 张"),
    imageRatio: pickString(raw?.imageGenerationPackage?.imageRatio, "1:1 正方形"),
    imageStyle: pickString(raw?.imageGenerationPackage?.imageStyle, "干净、清晰、有电商销售感，适合 TEMU 平台"),
    restrictions: pickString(raw?.imageGenerationPackage?.restrictions, "不要出现品牌词，不要夸大功能，不要改变产品主体结构，不要生成产品没有的功能")
  };
  const titlePackageBase = {
    productName: pickString(raw?.titleSellingPointPackage?.productName, productBasics.productName),
    productCategory: pickString(raw?.titleSellingPointPackage?.productCategory, productBasics.productCategory),
    combinationPlan: pickString(raw?.titleSellingPointPackage?.combinationPlan, planA.combinationName),
    productImages: pickString(raw?.titleSellingPointPackage?.productImages, product.images?.length ? "已上传" : "待上传"),
    targetPlatform: pickString(raw?.titleSellingPointPackage?.targetPlatform, "TEMU"),
    outputRequirements: pickStringArray(raw?.titleSellingPointPackage?.outputRequirements).length > 0
      ? pickStringArray(raw?.titleSellingPointPackage?.outputRequirements)
      : fallback.titleSellingPointPackage.outputRequirements,
    fixedRequirements: pickStringArray(raw?.titleSellingPointPackage?.fixedRequirements).length > 0
      ? pickStringArray(raw?.titleSellingPointPackage?.fixedRequirements)
      : fallback.titleSellingPointPackage.fixedRequirements
  };

  return {
    productBasics,
    packagingValue,
    planA,
    planB,
    priorityAdvice: "建议优先执行方案 A。",
    materialChecklist,
    imageGenerationPackage: {
      ...imagePackageBase,
      copyText: pickString(raw?.imageGenerationPackage?.copyText, buildImagePackageCopyText(imagePackageBase, product))
    },
    titleSellingPointPackage: {
      ...titlePackageBase,
      copyText: pickString(raw?.titleSellingPointPackage?.copyText, buildTitlePackageCopyText(titlePackageBase))
    },
    boundaryReminder: pickString(raw?.boundaryReminder, boundaryReminder)
  };
}

export function parseAIAnalysisReport({ product, rawText }: ParseAIAnalysisReportParams): AnalysisReport {
  const raw = parseRawOutput(rawText);

  const report: AnalysisReport = {
    input: product,
    dataCompleteness: createDataCompleteness(product),
    imageRecognition: mapImageRecognition(raw.imageRecognition, product),
    hotProductAnalysis: mapHotProductAnalysis(raw.hotProductAnalysis),
    directCopyRisk: mapDirectCopyRisk(raw.directCopyRisk),
    recommendations: mapRecommendations(raw.recommendations),
    finalConclusion: pickString(raw.finalConclusion, "当前产品需要结合素材完整度和供应链情况继续判断。"),
    actionSuggestions: pickStringArray(raw.actionSuggestions),
    preGenerationReport: mapPreGenerationReport(raw.preGenerationReport, product)
  };

  try {
    return validateAndPolishAIReport(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知后处理错误";
    console.warn("[AI_REPORT_POLISH_FAILED]", { errorType: "polish", message });
    return report;
  }
}
