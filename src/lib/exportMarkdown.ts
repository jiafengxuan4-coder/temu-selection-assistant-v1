import { formatAnalysisReportText } from "@/lib/reportFormatter";
import type { AnalysisReport } from "@/types/recommendation";

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function sanitizeFileNamePart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function downloadMarkdownReport(report: AnalysisReport): void {
  const titlePart = sanitizeFileNamePart(report.input.title);
  const datePart = formatDate(new Date());
  const fileName = titlePart
    ? `temu-report-${titlePart}-${datePart}.md`
    : `temu-selection-report-${datePart}.md`;
  const markdownContent = formatAnalysisReportText(report);
  const blob = new Blob([markdownContent], {
    type: "text/markdown;charset=utf-8"
  });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
