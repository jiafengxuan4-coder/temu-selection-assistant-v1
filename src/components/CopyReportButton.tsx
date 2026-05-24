"use client";

import { useState } from "react";
import { formatAnalysisReportText } from "@/lib/reportFormatter";
import type { AnalysisReport } from "@/types/recommendation";

type CopyReportButtonProps = {
  report: AnalysisReport;
};

export function CopyReportButton({ report }: CopyReportButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(formatAnalysisReportText(report));
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("failed");
      window.setTimeout(() => setStatus("idle"), 2000);
    }
  }

  const label = status === "copied" ? "已复制" : status === "failed" ? "复制失败，请手动复制" : "复制报告";

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
    >
      {label}
    </button>
  );
}
