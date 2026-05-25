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

function formatSpecValue(value: string | undefined): string {
  return value?.trim() ? value.trim() : "未提供";
}

function formatSpecsLines(report: AnalysisReport): string[] {
  const specs = report.input.productSpecs;

  return [
    `主产品规格：${formatSpecValue(specs?.mainProductSpec)}`,
    `配件规格：${formatSpecValue(specs?.accessorySpec)}`,
    `产品尺寸：${formatSpecValue(specs?.productSize)}`,
    `包装重量：${formatSpecValue(specs?.packageWeight)}`,
    `包装尺寸：${formatSpecValue(specs?.packageSize)}`,
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
    "请根据以下资料生成 TEMU 商品图：",
    `当前使用方案：${plan.label}`,
    `产品名称：${pkg.productName}`,
    `产品类目：${pkg.productCategory}`,
    `推荐组合方案：${plan.combinationName}`,
    `组合内容：${plan.combinationContent}`,
    `目标人群：${plan.targetUsers}`,
    `使用场景：${plan.usageScene}`,
    `核心卖点：${plan.coreSellingPoints}`,
    `参考图片：${pkg.referenceImages}`,
    `生成图片数量：${pkg.imageCount}`,
    `图片比例：${pkg.imageRatio}`,
    `图片风格：${pkg.imageStyle}`,
    "规格信息：",
    ...formatSpecsLines(report),
    `禁止事项：${pkg.restrictions}`,
    "固定要求：如果有规格信息，请生成一张规格/尺码说明图；如果规格信息不完整，不要编造尺寸、重量、材质、承重或认证数据。",
    "第 5 张图建议为规格/细节图，优先展示规格、尺寸、尺码、配件清单；如果规格信息不足，则只展示真实可见的产品细节，不要编造数据。"
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
