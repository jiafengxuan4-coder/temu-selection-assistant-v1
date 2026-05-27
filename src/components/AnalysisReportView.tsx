"use client";

import { useState } from "react";
import { CopyReportButton } from "@/components/CopyReportButton";
import { ExportMarkdownButton } from "@/components/ExportMarkdownButton";
import {
  formatImageGenerationPackage,
  formatTitleSellingPointPackage,
  type PackagePlanSelection
} from "@/lib/reportFormatter";
import type { ClientAnalysisSource } from "@/lib/clientAnalyze";
import type { AnalyzeModelInfo } from "@/types/ai";
import type { AnalysisReport } from "@/types/recommendation";

type AnalysisReportViewProps = {
  report: AnalysisReport;
  onReanalyze?: () => void;
  analysisSource?: ClientAnalysisSource;
  analysisMessage?: string;
  modelInfo?: AnalyzeModelInfo;
  isAnalyzing?: boolean;
};

type CopyPackageButtonProps = {
  label: string;
  text: string;
};

function fallbackCopyText(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  textarea.style.left = "-9999px";

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

async function copyTextWithFallback(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the textarea fallback for browsers that block clipboard access.
    }
  }

  return fallbackCopyText(text);
}

function CopyPackageButton({ label, text }: CopyPackageButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed" | "empty">("idle");

  async function handleCopy() {
    if (!text.trim()) {
      setStatus("empty");
      window.setTimeout(() => setStatus("idle"), 2000);
      return;
    }

    const copied = await copyTextWithFallback(text);

    if (copied) {
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 2000);
    } else {
      setStatus("failed");
      window.setTimeout(() => setStatus("idle"), 2000);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
    >
      {status === "copied"
        ? "复制成功"
        : status === "failed"
          ? "复制失败，请手动复制"
          : status === "empty"
            ? "暂无可复制内容"
            : label}
    </button>
  );
}

function formatProductPrice(report: AnalysisReport): string {
  const priceDisplay = report.input.priceDisplay?.trim();
  if (priceDisplay && priceDisplay.length > 0) {
    return priceDisplay;
  }

  return Number.isFinite(report.input.price) && report.input.price > 0 ? String(report.input.price) : "未提供";
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm leading-6 text-slate-800">{value}</p>
    </div>
  );
}

export function AnalysisReportView({
  report,
  onReanalyze,
  analysisSource,
  analysisMessage,
  modelInfo,
  isAnalyzing = false
}: AnalysisReportViewProps) {
  const pre = report.preGenerationReport;
  const [selectedPackagePlan, setSelectedPackagePlan] = useState<PackagePlanSelection>("A");
  const imagePackageText = formatImageGenerationPackage(report, selectedPackagePlan);
  const titlePackageText = formatTitleSellingPointPackage(report, selectedPackagePlan);

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">TEMU AI 图文生成前置报告</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              根据产品信息，自动生成组合方案、1688 素材清单、ChatGPT 生图资料包和标题卖点资料包。
            </p>
            {analysisSource ? (
              <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                <p>
                  <strong className="text-slate-950">当前使用：</strong>
                  {analysisSource === "api" ? "AI API 分析" : "Mock 兜底分析"}
                </p>
                {analysisMessage ? (
                  <p className="mt-1 text-slate-500">
                    {analysisSource === "mock_fallback" ? `原因：${analysisMessage}` : analysisMessage}
                  </p>
                ) : null}
                {modelInfo ? (
                  <div className="mt-2 grid gap-1 text-xs text-slate-500 sm:grid-cols-3">
                    <p>当前 provider：{modelInfo.provider}</p>
                    <p>文本分析模型：{modelInfo.textModel}</p>
                    <p>截图识别模型：{modelInfo.visionModel}</p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <CopyReportButton report={report} />
            <ExportMarkdownButton report={report} />
            {onReanalyze ? (
              <button
                type="button"
                onClick={onReanalyze}
                disabled={isAnalyzing}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                {isAnalyzing ? "正在生成报告..." : "重新分析"}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-950">一、产品基础识别</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {pre.productBasics.rawRecognizedTitle || report.input.rawRecognizedTitle ? (
            <InfoRow label="原始识别标题" value={pre.productBasics.rawRecognizedTitle ?? report.input.rawRecognizedTitle ?? "未识别"} />
          ) : null}
          <InfoRow label="清洗后产品名称" value={pre.productBasics.productName} />
          <InfoRow label="产品类目" value={pre.productBasics.productCategory} />
          <InfoRow label="商品价格" value={formatProductPrice(report)} />
          <InfoRow label="当前产品组成" value={pre.productBasics.currentComposition} />
          <InfoRow label="产品主要用途" value={pre.productBasics.mainUse} />
          <InfoRow label="适合人群" value={pre.productBasics.targetUsers} />
          <InfoRow label="主要使用场景" value={pre.productBasics.usageScenes} />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-950">二、产品包装价值判断</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <InfoRow label="是否值得继续包装" value={pre.packagingValue.worthPackaging} />
          <InfoRow label="产品类型" value={pre.packagingValue.productType} />
          <InfoRow label="比价风险" value={pre.packagingValue.priceComparisonRisk} />
          <InfoRow label="可变形空间" value={pre.packagingValue.transformationSpace} />
          <InfoRow label="图片表达空间" value={pre.packagingValue.imageExpressionSpace} />
          <InfoRow label="SKU 依赖程度" value={pre.packagingValue.skuDependency} />
          <InfoRow label="当前 SKU 信息" value={pre.packagingValue.currentSkuInfo} />
          <InfoRow label="SKU 对转化影响" value={pre.packagingValue.skuConversionImpact} />
          <InfoRow label="规格选项建议" value={pre.packagingValue.skuSuggestion} />
          <InfoRow label="一句话判断" value={pre.packagingValue.oneSentenceJudgment} />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-950">三、推荐组合方案</h3>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-900">方案 A：优先测试方案</p>
            <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
              <p><strong>组合名称：</strong>{pre.planA.combinationName}</p>
              <p><strong>组合内容：</strong>{pre.planA.combinationContent}</p>
              <p><strong>目标人群：</strong>{pre.planA.targetUsers}</p>
              <p><strong>使用场景：</strong>{pre.planA.usageScene}</p>
              <p><strong>核心卖点：</strong>{pre.planA.coreSellingPoints}</p>
              <p><strong>为什么适合优先测试：</strong>{pre.planA.whyPriorityTest}</p>
              <p><strong>适合生成什么类型图片：</strong>{pre.planA.suitableImageTypes}</p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-950">方案 B：备选升级方案</p>
            <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
              <p><strong>组合名称：</strong>{pre.planB.combinationName}</p>
              <p><strong>组合内容：</strong>{pre.planB.combinationContent}</p>
              <p><strong>目标人群：</strong>{pre.planB.targetUsers}</p>
              <p><strong>使用场景：</strong>{pre.planB.usageScene}</p>
              <p><strong>核心卖点：</strong>{pre.planB.coreSellingPoints}</p>
              <p><strong>适合什么时候尝试：</strong>{pre.planB.whenToTry}</p>
              <p><strong>需要注意什么：</strong>{pre.planB.notes}</p>
            </div>
          </div>
        </div>
        <p className="mt-4 rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white">
          {pre.priorityAdvice}
        </p>
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-950">选择后续用于 ChatGPT 生成的方案</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="flex cursor-pointer items-start gap-2 rounded-md border border-slate-200 p-3 text-sm text-slate-700 hover:bg-slate-50">
              <input
                type="radio"
                name="package-plan"
                value="A"
                checked={selectedPackagePlan === "A"}
                onChange={() => setSelectedPackagePlan("A")}
                className="mt-1"
              />
              <span>
                <span className="block font-medium text-slate-950">方案 A：优先测试方案（推荐）</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  下方生图资料包和标题卖点资料包默认使用方案 A。
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 rounded-md border border-slate-200 p-3 text-sm text-slate-700 hover:bg-slate-50">
              <input
                type="radio"
                name="package-plan"
                value="B"
                checked={selectedPackagePlan === "B"}
                onChange={() => setSelectedPackagePlan("B")}
                className="mt-1"
              />
              <span>
                <span className="block font-medium text-slate-950">方案 B：备选升级方案</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  选择后，下方两个资料包会切换为方案 B 内容。
                </span>
              </span>
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-950">四、1688 素材准备清单</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="px-3 py-2 font-medium">素材类型</th>
                <th className="px-3 py-2 font-medium">是否必须</th>
                <th className="px-3 py-2 font-medium">用途</th>
              </tr>
            </thead>
            <tbody>
              {pre.materialChecklist.map((item) => (
                <tr key={`${item.materialType}-${item.usage}`} className="border-b border-slate-100">
                  <td className="px-3 py-2 text-slate-900">{item.materialType}</td>
                  <td className="px-3 py-2 text-slate-700">{item.requirement}</td>
                  <td className="px-3 py-2 text-slate-700">{item.usage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-slate-950">五、复制给 ChatGPT 的生图资料包</h3>
          <CopyPackageButton label="复制生图资料包" text={imagePackageText} />
        </div>
        <pre className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-slate-950 p-4 text-xs leading-6 text-slate-50">
          {imagePackageText}
        </pre>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-slate-950">六、复制给 ChatGPT 的标题卖点资料包</h3>
          <CopyPackageButton label="复制标题卖点资料包" text={titlePackageText} />
        </div>
        <pre className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-slate-950 p-4 text-xs leading-6 text-slate-50">
          {titlePackageText}
        </pre>
      </section>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-amber-950">七、边界提醒</h3>
        <p className="mt-3 text-sm leading-6 text-amber-900">{pre.boundaryReminder}</p>
      </section>
    </div>
  );
}
