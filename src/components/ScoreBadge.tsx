type ScoreBadgeProps = {
  label: string;
  score: number;
  highlight?: boolean;
};

function getScoreLabel(score: number): string {
  if (score >= 80) {
    return "高";
  }

  if (score >= 60) {
    return "中高";
  }

  if (score >= 40) {
    return "中低";
  }

  return "低";
}

export function ScoreBadge({ label, score, highlight = false }: ScoreBadgeProps) {
  return (
    <div className={`rounded-md border px-3 py-2 ${highlight ? "border-slate-300 bg-slate-950 text-white" : "border-slate-200 bg-slate-50 text-slate-950"}`}>
      <div className={highlight ? "text-xs text-slate-200" : "text-xs text-slate-500"}>{label}</div>
      <div className="mt-1 text-lg font-semibold">
        {score} / {getScoreLabel(score)}
      </div>
    </div>
  );
}
