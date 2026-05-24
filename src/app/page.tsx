"use client";

import { useState } from "react";
import { AnalysisReportView } from "@/components/AnalysisReportView";
import { ProductInputForm } from "@/components/ProductInputForm";
import { generateMockAnalysisReport } from "@/lib/mockAnalysis";
import type { ProductInput } from "@/types/product";
import type { AnalysisReport } from "@/types/recommendation";

export default function Home() {
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [currentProduct, setCurrentProduct] = useState<ProductInput | null>(null);

  function handleSubmit(product: ProductInput) {
    setCurrentProduct(product);
    setReport(generateMockAnalysisReport(product));
  }

  function handleClear() {
    setCurrentProduct(null);
    setReport(null);
  }

  function handleReanalyze() {
    if (currentProduct) {
      setReport(generateMockAnalysisReport(currentProduct));
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="space-y-3">
          <p className="text-sm font-medium text-slate-500">temu-selection-assistant-v1</p>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
              TEMU 核价选品助手
            </h1>
            <p className="max-w-3xl text-base leading-7 text-slate-600">
              上传爆款信息，拆解疑似爆款因素，生成更容易通过核价的差异化选品方向。
            </p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            当前版本为 MVP 演示版：图片识别暂未接入真实 AI，本版本使用模拟图片识别结果。真实图片识别将在下一版本接入。
          </div>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
          <ProductInputForm
            onSubmit={handleSubmit}
            onClear={handleClear}
            onDraftChange={setCurrentProduct}
          />
          <section className="min-w-0">
            {report ? (
              <AnalysisReportView report={report} onReanalyze={handleReanalyze} />
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm leading-6 text-slate-600">
                填写商品标题、类目和价格后，点击生成选品报告。图片识别将在下一版接入，本版本先使用模拟图片识别结果。
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
