"use client";

import { useState } from "react";
import { AnalysisReportView } from "@/components/AnalysisReportView";
import { ProductInputForm } from "@/components/ProductInputForm";
import { analyzeProductFromClient } from "@/lib/clientAnalyze";
import type { ClientAnalysisSource } from "@/lib/clientAnalyze";
import type { ProductInput } from "@/types/product";
import type { AnalysisReport } from "@/types/recommendation";

export default function Home() {
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [currentProduct, setCurrentProduct] = useState<ProductInput | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisSource, setAnalysisSource] = useState<ClientAnalysisSource | undefined>();
  const [analysisMessage, setAnalysisMessage] = useState<string | undefined>();

  async function runAnalysis(product: ProductInput) {
    setIsAnalyzing(true);
    setAnalysisMessage(undefined);

    try {
      const result = await analyzeProductFromClient(product);
      setReport(result.report);
      setAnalysisSource(result.source);
      setAnalysisMessage(result.message);
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleSubmit(product: ProductInput) {
    setCurrentProduct(product);
    void runAnalysis(product);
  }

  function handleClear() {
    setCurrentProduct(null);
    setReport(null);
    setAnalysisSource(undefined);
    setAnalysisMessage(undefined);
    setIsAnalyzing(false);
  }

  function handleReanalyze() {
    if (currentProduct) {
      void runAnalysis(currentProduct);
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
            当前版本为 MVP 演示版：支持上传商品截图，系统会优先识别标题、价格、销量、评分等信息；识别不完整时可手动补充。
          </div>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
          <ProductInputForm
            onSubmit={handleSubmit}
            onClear={handleClear}
            onDraftChange={setCurrentProduct}
            isSubmitting={isAnalyzing}
          />
          <section className="min-w-0">
            {report ? (
              <AnalysisReportView
                report={report}
                onReanalyze={handleReanalyze}
                analysisSource={analysisSource}
                analysisMessage={analysisMessage}
                isAnalyzing={isAnalyzing}
              />
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm leading-6 text-slate-600">
                {analysisMessage
                  ? analysisMessage
                  : "填写商品标题、类目和价格，或上传商品截图后点击生成选品报告。识别不完整时请手动补充关键字段。"}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
