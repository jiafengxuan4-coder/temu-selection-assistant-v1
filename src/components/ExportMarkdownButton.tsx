"use client";

import { useState } from "react";
import { downloadMarkdownReport } from "@/lib/exportMarkdown";
import type { AnalysisReport } from "@/types/recommendation";

type ExportMarkdownButtonProps = {
  report: AnalysisReport;
};

export function ExportMarkdownButton({ report }: ExportMarkdownButtonProps) {
  const [status, setStatus] = useState<"idle" | "exported" | "failed">("idle");

  function handleExport() {
    try {
      downloadMarkdownReport(report);
      setStatus("exported");
      window.setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("failed");
      window.setTimeout(() => setStatus("idle"), 2000);
    }
  }

  const label = status === "exported" ? "已导出" : status === "failed" ? "导出失败" : "导出 Markdown";

  return (
    <button
      type="button"
      onClick={handleExport}
      className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
    >
      {label}
    </button>
  );
}
