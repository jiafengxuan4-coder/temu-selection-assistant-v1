import { ScoreBadge } from "@/components/ScoreBadge";
import type {
  RecommendationDirection,
  RecommendationDirectionType,
  RecommendationLevel
} from "@/types/recommendation";

type RecommendationCardProps = {
  recommendation: RecommendationDirection;
};

const levelLabelMap: Record<RecommendationLevel, string> = {
  priority_test: "推荐优先测试",
  small_batch_test: "可以小批量测试",
  cautious: "谨慎，不建议优先做",
  not_recommended: "不建议做"
};

const typeLabelMap: Record<RecommendationDirectionType, string> = {
  bundle: "组合款方向",
  upgrade: "升级款方向",
  scene_segment: "场景细分方向",
  user_segment: "人群细分方向",
  function_difference: "功能差异方向",
  review_pain_point: "评论痛点改良方向",
  image_expression: "图片表达迁移方向",
  cautious: "谨慎方向"
};

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{typeLabelMap[recommendation.type]}</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-950">{recommendation.title}</h3>
          <p className="mt-1 text-sm font-medium text-slate-700">{levelLabelMap[recommendation.level]}</p>
        </div>
        <div className="w-fit rounded-md bg-slate-950 px-3 py-2 text-white">
          <div className="text-xs text-slate-200">综合推荐分</div>
          <div className="text-xl font-semibold">{recommendation.score.finalRecommendationScore}</div>
        </div>
      </div>

      <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700">
        <p>
          <strong className="text-slate-950">推荐产品方案：</strong>
          {recommendation.productIdea}
        </p>
      </div>

      <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-700">
        <p>
          <strong className="text-slate-950">推荐理由：</strong>
          {recommendation.reason}
        </p>
        <p>
          <strong className="text-slate-950">降低比价风险：</strong>
          {recommendation.howItReducesPriceComparisonRisk}
        </p>
        <p>
          <strong className="text-slate-950">销售机会：</strong>
          {recommendation.whyItStillHasSalesPotential}
        </p>
      </div>

      <div className="mt-4">
        <h4 className="text-sm font-semibold text-slate-950">潜在风险</h4>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">
          {recommendation.potentialRisks.map((risk) => (
            <li key={risk}>{risk}</li>
          ))}
        </ul>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <ScoreBadge label="销售潜力分" score={recommendation.score.salesPotentialScore} />
        <ScoreBadge label="核价通过分" score={recommendation.score.priceApprovalScore} highlight />
        <ScoreBadge label="综合推荐分" score={recommendation.score.finalRecommendationScore} highlight />
      </div>
    </article>
  );
}
