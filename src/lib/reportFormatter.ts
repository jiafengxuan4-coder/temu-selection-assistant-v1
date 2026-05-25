import type { AnalysisReport } from "@/types/recommendation";

export type PackagePlanSelection = "A" | "B";

function formatList(items: string[]): string {
  if (items.length === 0) return "- 暂无";
  return items.map((item) => `- ${item}`).join("\n");
}

function formatProductPrice(report: AnalysisReport): string {
  const priceDisplay = report.input.priceDisplay?.trim();
  return priceDisplay && priceDisplay.length > 0 ? priceDisplay : String(report.input.price);
}

function trimNumber(value: number): string {
  return Number(value.toFixed(2)).toString();
}

function lengthToInches(value: number, unit: string): number | undefined {
  const normalizedUnit = unit.toLowerCase();

  if (normalizedUnit === "mm") return value * 0.03937;
  if (normalizedUnit === "cm") return value * 0.3937;
  if (normalizedUnit === "m") return value * 39.37;
  if (normalizedUnit === "in" || normalizedUnit === "inch") return value;
  if (normalizedUnit === "ft" || normalizedUnit === "feet") return value * 12;

  return undefined;
}

function weightToPounds(value: number, unit: string): number | undefined {
  const normalizedUnit = unit.toLowerCase();

  if (normalizedUnit === "g") return value * 0.00220462;
  if (normalizedUnit === "kg") return value * 2.20462;
  if (normalizedUnit === "oz") return value * 0.0625;
  if (normalizedUnit === "lb") return value;

  return undefined;
}

function appendConvertedLength(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;

  const dimensionMatch = trimmed.match(/(\d+(?:\.\d+)?(?:\s*(?:x|×|\*)\s*\d+(?:\.\d+)?)+)\s*(mm|cm|m|in|inch|ft|feet)\b/i);

  if (dimensionMatch) {
    const unit = dimensionMatch[2];
    const convertedValues = dimensionMatch[1]
      .split(/\s*(?:x|×|\*)\s*/)
      .map((part) => lengthToInches(Number(part), unit));

    if (convertedValues.every((value): value is number => typeof value === "number" && Number.isFinite(value))) {
      return `${trimmed}（约 ${convertedValues.map((value) => trimNumber(value)).join(" x ")} in）`;
    }
  }

  const rangeMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(mm|cm|m|in|inch|ft|feet)\b/i);

  if (rangeMatch) {
    const startValue = lengthToInches(Number(rangeMatch[1]), rangeMatch[3]);
    const endValue = lengthToInches(Number(rangeMatch[2]), rangeMatch[3]);

    if (
      typeof startValue === "number" &&
      Number.isFinite(startValue) &&
      typeof endValue === "number" &&
      Number.isFinite(endValue)
    ) {
      return `${trimmed}（约 ${trimNumber(startValue)}-${trimNumber(endValue)} in）`;
    }
  }

  const lengthMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*(mm|cm|m|in|inch|ft|feet)\b/i);

  if (!lengthMatch) return trimmed;

  const convertedValue = lengthToInches(Number(lengthMatch[1]), lengthMatch[2]);
  return typeof convertedValue === "number" && Number.isFinite(convertedValue)
    ? `${trimmed}（约 ${trimNumber(convertedValue)} in）`
    : trimmed;
}

function appendConvertedWeight(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;

  const weightMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*(g|kg|oz|lb)\b/i);

  if (!weightMatch) return trimmed;

  const convertedValue = weightToPounds(Number(weightMatch[1]), weightMatch[2]);
  return typeof convertedValue === "number" && Number.isFinite(convertedValue)
    ? `${trimmed}（约 ${trimNumber(convertedValue)} lb）`
    : trimmed;
}

function normalizeSpecValue(value: string | undefined, type: "length" | "weight" | "mixed" | "raw"): string {
  if (!value?.trim()) return "未提供";

  const trimmed = value.trim();

  if (type === "length") return appendConvertedLength(trimmed);
  if (type === "weight") return appendConvertedWeight(trimmed);
  if (type === "mixed") {
    return trimmed
      .split(";")
      .map((part) => appendConvertedWeight(appendConvertedLength(part)))
      .join("; ");
  }

  return trimmed;
}

function formatSpecValue(value: string | undefined): string {
  return value?.trim() ? value.trim() : "未提供";
}

function formatSpecsLines(report: AnalysisReport): string[] {
  const specs = report.input.productSpecs;

  return [
    `主产品规格：${normalizeSpecValue(specs?.mainProductSpec, "mixed")}`,
    `配件规格：${normalizeSpecValue(specs?.accessorySpec, "mixed")}`,
    `产品尺寸：${normalizeSpecValue(specs?.productSize, "length")}`,
    `包装重量：${normalizeSpecValue(specs?.packageWeight, "weight")}`,
    `包装尺寸：${normalizeSpecValue(specs?.packageSize, "length")}`,
    `颜色/尺码选项：${formatSpecValue(specs?.colorSizeOptions)}`
  ];
}

function getSelectedPlan(report: AnalysisReport, selectedPlan: PackagePlanSelection) {
  const pre = report.preGenerationReport;

  if (selectedPlan === "B") {
    return {
      label: "方案 B",
      combinationName: pre.planB.combinationName,
      combinationContent: pre.planB.combinationContent,
      targetUsers: pre.planB.targetUsers,
      usageScene: pre.planB.usageScene,
      coreSellingPoints: pre.planB.coreSellingPoints
    };
  }

  return {
    label: "方案 A",
    combinationName: pre.planA.combinationName,
    combinationContent: pre.planA.combinationContent,
    targetUsers: pre.planA.targetUsers,
    usageScene: pre.planA.usageScene,
    coreSellingPoints: pre.planA.coreSellingPoints
  };
}

export function formatImageGenerationPackage(
  report: AnalysisReport,
  selectedPlan: PackagePlanSelection = "A"
): string {
  const pkg = report.preGenerationReport.imageGenerationPackage;
  const plan = getSelectedPlan(report, selectedPlan);

  return [
    "你是一个 TEMU 电商产品图生成助手。",
    "",
    "我会上传产品参考图，并提供产品信息和组合方案。请严格参考我上传的产品图，不要随意改变产品主体结构、颜色、配件和材质。",
    "",
    "目标：",
    "为该产品生成一组适合 TEMU 平台使用的电商产品图。",
    "",
    "重要要求：",
    "1. 所有生成图片中的可见文字必须使用英文。",
    "2. 不要在图片中出现中文。",
    "3. 英文文案要简短、清晰，适合电商图片展示。",
    "4. 不要出现品牌词。",
    "5. 不要夸大产品功能。",
    "6. 不要生成产品没有的功能。",
    "7. 不要编造尺寸、重量、材质、承重、认证或测试数据。",
    "8. 如果规格信息不完整，不要自行补充或猜测。",
    "9. 尽量保持上传产品的外观、颜色、结构一致。",
    "10. 图片比例为 1:1 正方形，风格干净、清晰、有电商销售感，适合 TEMU 平台。",
    "",
    "Visual style requirements:",
    "- The images must look like high-converting e-commerce product images, not plain catalog shots.",
    "- Make the product visually striking, clean, premium, and highly clickable.",
    "- Use strong product focus, clear composition, balanced layout, and attractive lighting.",
    "- The product should feel like the hero of the image and stand out clearly.",
    "- Add depth, subtle shadows, and polished visual hierarchy where appropriate.",
    "- Keep the images clean and sales-driven, with a strong commercial look.",
    "- Avoid flat, boring, or generic product presentation.",
    "- Each image should feel visually appealing and optimized for e-commerce click-through performance.",
    "",
    "CTR-oriented image goals:",
    "The overall image set should be optimized for e-commerce click-through rate:",
    "- strong first impression",
    "- clear product value communication",
    "- visually engaging composition",
    "- attractive and professional presentation",
    "",
    "产品信息：",
    `产品名称：${pkg.productName}`,
    `产品类目：${pkg.productCategory}`,
    `当前使用方案：${plan.label}`,
    `组合名称：${plan.combinationName}`,
    `组合内容：${plan.combinationContent}`,
    `目标人群：${plan.targetUsers}`,
    `使用场景：${plan.usageScene}`,
    `核心卖点：${plan.coreSellingPoints}`,
    "规格信息：",
    ...formatSpecsLines(report),
    `参考图片：${pkg.referenceImages}`,
    "",
    "请默认生成 5 张图：",
    "",
    "第 1 张：白底主图",
    "要求：白色背景，清晰展示主产品和组合配件，让用户一眼知道买到什么。",
    "- This should be a strong hero product image.",
    "- Use a clean white background, but avoid a flat or boring layout.",
    "- Make the main product and accessories visually prominent.",
    "- Add subtle depth and shadow to create a more polished e-commerce look.",
    "",
    "第 2 张：使用场景图",
    "要求：展示产品在真实使用场景中的效果，场景要自然，产品主体要清晰。",
    "- The scene should feel realistic, appealing, and visually engaging.",
    "- Show the product in a natural lifestyle setting with clear product visibility.",
    "- The image should create emotional appeal and purchase desire.",
    "",
    "第 3 张：细节图",
    "要求：展示产品结构、扣具、配件、连接方式或做工细节，不要编造不存在的材质和功能。",
    "- Use close-up or macro-style composition to emphasize important details.",
    "- Show structure, stitching, buckles, grip, connectors, or other useful product details with strong visual clarity.",
    "",
    "第 4 张：卖点图",
    "要求：突出 1-2 个核心卖点，英文文案简短，不要堆太多信息。",
    "- Highlight 1-2 key selling points only.",
    "- Use short English phrases with clear visual hierarchy.",
    "- Make the image informative but also visually attractive.",
    "",
    "第 5 张：尺寸/规格图",
    "要求：如果已提供明确规格信息，请生成尺寸/规格说明图；如果没有明确规格信息，请不要编造尺寸，改为组合清单图或补充细节图。",
    "- Keep the layout clear, organized, and easy to read.",
    "- Prioritize clarity and trustworthiness over visual drama.",
    "- If size/spec data is missing, replace with a package contents image or an extra product detail image.",
    "",
    "如果用户要求生成超过 5 张图：",
    "前 5 张仍然必须按以上结构生成，第 6 张以后可以扩展为配件关系图、组合价值图、多颜色/多尺码图、补充卖点图或包装清单图。",
    "",
    `禁止事项：${pkg.restrictions}`
  ].join("\n");
}

export function formatTitleSellingPointPackage(
  report: AnalysisReport,
  selectedPlan: PackagePlanSelection = "A"
): string {
  const pkg = report.preGenerationReport.titleSellingPointPackage;
  const plan = getSelectedPlan(report, selectedPlan);

  return [
    "请根据以下资料生成 TEMU 商品标题和卖点：",
    `当前使用方案：${plan.label}`,
    `产品名称：${pkg.productName}`,
    `产品类目：${pkg.productCategory}`,
    `组合方案：${plan.combinationName}`,
    `产品图片 / AI 生成图：${pkg.productImages}`,
    `目标平台：${pkg.targetPlatform}`,
    "输出要求：",
    ...pkg.outputRequirements.map((item) => `- ${item}`),
    "固定要求：",
    ...pkg.fixedRequirements.map((item) => `- ${item}`)
  ].join("\n");
}

export function formatAnalysisReportText(report: AnalysisReport): string {
  const pre = report.preGenerationReport;

  const materialRows = pre.materialChecklist
    .map((item) => `| ${item.materialType} | ${item.requirement} | ${item.usage} |`)
    .join("\n");

  return [
    "# TEMU AI 图文生成前置报告",
    "",
    "根据产品信息，自动生成组合方案、1688 素材清单、ChatGPT 生图资料包和标题卖点资料包。",
    "",
    "## 一、产品基础识别",
    "",
    `- 产品名称：${pre.productBasics.productName}`,
    `- 产品类目：${pre.productBasics.productCategory}`,
    `- 商品价格：${formatProductPrice(report)}`,
    `- 当前产品组成：${pre.productBasics.currentComposition}`,
    `- 产品主要用途：${pre.productBasics.mainUse}`,
    `- 适合人群：${pre.productBasics.targetUsers}`,
    `- 主要使用场景：${pre.productBasics.usageScenes}`,
    "",
    "## 二、产品包装价值判断",
    "",
    `- 是否值得继续包装：${pre.packagingValue.worthPackaging}`,
    `- 产品类型：${pre.packagingValue.productType}`,
    `- 比价风险：${pre.packagingValue.priceComparisonRisk}`,
    `- 可变形空间：${pre.packagingValue.transformationSpace}`,
    `- 图片表达空间：${pre.packagingValue.imageExpressionSpace}`,
    `- 一句话判断：${pre.packagingValue.oneSentenceJudgment}`,
    "",
    "## 三、推荐组合方案",
    "",
    "### 方案 A：优先测试方案",
    "",
    `- 组合名称：${pre.planA.combinationName}`,
    `- 组合内容：${pre.planA.combinationContent}`,
    `- 目标人群：${pre.planA.targetUsers}`,
    `- 使用场景：${pre.planA.usageScene}`,
    `- 核心卖点：${pre.planA.coreSellingPoints}`,
    `- 为什么适合优先测试：${pre.planA.whyPriorityTest}`,
    `- 适合生成什么类型图片：${pre.planA.suitableImageTypes}`,
    "",
    "### 方案 B：备选升级方案",
    "",
    `- 组合名称：${pre.planB.combinationName}`,
    `- 组合内容：${pre.planB.combinationContent}`,
    `- 目标人群：${pre.planB.targetUsers}`,
    `- 使用场景：${pre.planB.usageScene}`,
    `- 核心卖点：${pre.planB.coreSellingPoints}`,
    `- 适合什么时候尝试：${pre.planB.whenToTry}`,
    `- 需要注意什么：${pre.planB.notes}`,
    "",
    pre.priorityAdvice,
    "",
    "## 四、1688 素材准备清单",
    "",
    "| 素材类型 | 是否必须 | 用途 |",
    "| --- | --- | --- |",
    materialRows,
    "",
    "## 五、复制给 ChatGPT 的生图资料包",
    "",
    "```text",
    formatImageGenerationPackage(report),
    "```",
    "",
    "## 六、复制给 ChatGPT 的标题卖点资料包",
    "",
    "```text",
    formatTitleSellingPointPackage(report),
    "```",
    "",
    "## 七、边界提醒",
    "",
    pre.boundaryReminder,
    "",
    "## 附：操作建议",
    "",
    formatList(report.actionSuggestions)
  ].join("\n");
}
