"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { AnalysisReportView } from "@/components/AnalysisReportView";
import { ProductInputForm } from "@/components/ProductInputForm";
import { RecognizedFieldsPanel } from "@/components/RecognizedFieldsPanel";
import { analyzeProductFromClient } from "@/lib/clientAnalyze";
import type { ClientAnalysisSource } from "@/lib/clientAnalyze";
import type { ProductInput, RecognizedProductFields } from "@/types/product";
import type { AnalysisReport } from "@/types/recommendation";

const authorizedPhoneStorageKey = "temu_selection_authorized_phone";

type PhoneAuthResponse =
  | { ok: true; phone: string; message?: string }
  | { ok: false; message: string };

function maskPhone(phone: string): string {
  return phone.length === 11 ? `${phone.slice(0, 3)}****${phone.slice(7)}` : phone;
}

export default function Home() {
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [currentProduct, setCurrentProduct] = useState<ProductInput | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisSource, setAnalysisSource] = useState<ClientAnalysisSource | undefined>();
  const [analysisMessage, setAnalysisMessage] = useState<string | undefined>();
  const [recognizedFields, setRecognizedFields] = useState<RecognizedProductFields | undefined>();
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authorizedPhone, setAuthorizedPhone] = useState<string | null>(null);
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneAuthMessage, setPhoneAuthMessage] = useState<string | undefined>();
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);

  useEffect(() => {
    const savedPhone = window.localStorage.getItem(authorizedPhoneStorageKey);

    if (savedPhone) {
      setAuthorizedPhone(savedPhone);
    }

    setIsAuthReady(true);
  }, []);

  async function runAnalysis(product: ProductInput) {
    setIsAnalyzing(true);
    setAnalysisMessage(undefined);

    try {
      const result = await analyzeProductFromClient(product);
      setReport(result.report);
      setAnalysisSource(result.source);
      setAnalysisMessage(result.message);
      setRecognizedFields(result.recognizedFields);
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
    setRecognizedFields(undefined);
    setIsAnalyzing(false);
  }

  function handleReanalyze() {
    if (currentProduct) {
      void runAnalysis(currentProduct);
    }
  }

  async function handlePhoneAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPhoneAuthMessage(undefined);
    setIsCheckingPhone(true);

    try {
      const response = await fetch("/api/auth/phone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ phone: phoneInput })
      });
      const result = (await response.json()) as PhoneAuthResponse;

      if (result.ok) {
        window.localStorage.setItem(authorizedPhoneStorageKey, result.phone);
        setAuthorizedPhone(result.phone);
        setPhoneInput("");
        setPhoneAuthMessage(result.message);
        return;
      }

      setPhoneAuthMessage(result.message);
    } catch {
      setPhoneAuthMessage("验证服务暂不可用，请稍后重试。");
    } finally {
      setIsCheckingPhone(false);
    }
  }

  function handleSwitchPhone() {
    window.localStorage.removeItem(authorizedPhoneStorageKey);
    setAuthorizedPhone(null);
    setPhoneInput("");
    setPhoneAuthMessage(undefined);
    handleClear();
  }

  if (!isAuthReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 text-slate-950">
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          正在检查开通状态...
        </div>
      </main>
    );
  }

  if (!authorizedPhone) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 text-slate-950">
        <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-500">temu-selection-assistant-v1</p>
            <h1 className="text-2xl font-semibold text-slate-950">TEMU 核价选品助手</h1>
            <p className="text-sm leading-6 text-slate-600">请输入已开通的手机号进入工具。</p>
          </div>

          <form onSubmit={handlePhoneAuth} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">手机号</span>
              <input
                value={phoneInput}
                onChange={(event) => setPhoneInput(event.target.value)}
                inputMode="numeric"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                placeholder="请输入手机号"
              />
            </label>

            {phoneAuthMessage ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
                {phoneAuthMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isCheckingPhone}
              className="w-full rounded-md bg-slate-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isCheckingPhone ? "正在验证..." : "验证开通权限"}
            </button>
          </form>
        </section>
      </main>
    );
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
          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 sm:flex-row sm:items-center sm:justify-between">
            <span>当前登录手机号：{maskPhone(authorizedPhone)}</span>
            <button
              type="button"
              onClick={handleSwitchPhone}
              className="w-fit rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              切换手机号
            </button>
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
            recognizedFields={recognizedFields}
          />
          <section className="min-w-0">
            <div className="space-y-5">
              <RecognizedFieldsPanel recognizedFields={recognizedFields} manualProduct={currentProduct} />
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
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

