import { CopyReportButton } from "@/components/CopyReportButton";
import { ExportMarkdownButton } from "@/components/ExportMarkdownButton";
import { RecommendationCard } from "@/components/RecommendationCard";
import type {
  ConfidenceLevel,
  HotProductFactorType,
  PriceComparisonRiskLevel
} from "@/types/analysis";
import type { AnalysisReport } from "@/types/recommendation";

type AnalysisReportViewProps = {
  report: AnalysisReport;
};

const factorLabelMap: Record<HotProductFactorType, string> = {
  price: "价格因素",
  color: "颜色因素",
  style: "款式因素",
  image_click_rate: "图片点击率因素",
  comprehensive: "综合因素",
  unknown: "未知因素"
};

const confidenceLabelMap: Record<ConfidenceLevel, string> = {
  high: "高",
  medium: "中",
  low: "低",
  unknown: "未知"
};

const riskLevelLabelMap: Record<PriceComparisonRiskLevel, string> = {
  low: "低风险",
  medium: "中风险",
  high: "高风险",
  unknown: "未知"
};

function formatOptionalNumber(value: number | undefined): string {
  return typeof value === "number" ? String(value) : "未提供";
}

function getStatusLabel(value: boolean): string {
  return value ? "完整" : "缺失";
}

function getReadableWarning(warning: string): string {
  if (warning.includes("核价")) {
    return "该产品仍需经过平台核价验证。";
  }

  return warning;
}

export function AnalysisReportView({ report }: AnalysisReportViewProps) {
  const hasNoSales = !report.dataCompleteness.hasWeeklySales && !report.dataCompleteness.hasMonthlySales;
  const isHighRisk = report.directCopyRisk.riskLevel === "high";

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">结构化选品报告</h2>
            <p className="mt-1 text-sm text-slate-500">可复制为中文纯文本，方便发给学员、运营同事或客户。</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <CopyReportButton report={report} />
            <ExportMarkdownButton report={report} />
          </div>
        </div>
        <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-700 sm:grid-cols-2">
          <p><strong className="text-slate-950">商品标题：</strong>{report.input.title}</p>
          <p><strong className="text-slate-950">商品类目：</strong>{report.input.category}</p>
          <p><strong className="text-slate-950">商品价格：</strong>{report.input.price}</p>
          <p><strong className="text-slate-950">周销量：</strong>{formatOptionalNumber(report.input.weeklySales)}</p>
          <p><strong className="text-slate-950">月销量：</strong>{formatOptionalNumber(report.input.monthlySales)}</p>
          <p><strong className="text-slate-950">商品评分：</strong>{formatOptionalNumber(report.input.rating)}</p>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-950">数据完整度</h2>
          <p className="text-sm text-slate-500">数据越完整，报告越准确。</p>
        </div>

        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-md bg-slate-50 p-3">
            <p className="font-medium text-slate-950">必填数据</p>
            <p className="mt-1 text-slate-600">
              标题：{getStatusLabel(report.dataCompleteness.hasTitle)} / 类目：{getStatusLabel(report.dataCompleteness.hasCategory)} / 价格：{getStatusLabel(report.dataCompleteness.hasPrice)}
            </p>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <p className="font-medium text-slate-950">选填数据</p>
            <p className="mt-1 text-slate-600">
              周销量：{getStatusLabel(report.dataCompleteness.hasWeeklySales)} / 月销量：{getStatusLabel(report.dataCompleteness.hasMonthlySales)} / 评分：{getStatusLabel(report.dataCompleteness.hasRating)} / 评论：{getStatusLabel(report.dataCompleteness.hasReviews)}
            </p>
          </div>
        </div>

        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">
          {hasNoSales ? <li>缺少销量数据，销售潜力判断置信度降低。</li> : null}
          {!report.dataCompleteness.hasRating ? <li>缺少评分数据，无法判断用户满意度。</li> : null}
          {!report.dataCompleteness.hasReviews ? <li>缺少评论内容，本次不会分析用户真实反馈痛点。</li> : null}
          {report.dataCompleteness.missingFields
            .filter((field) => !field.includes("周销量") && !field.includes("月销量") && !field.includes("评分") && !field.includes("评论"))
            .map((field) => (
              <li key={field}>{field}</li>
            ))}
        </ul>
      </section>

      {report.imageRecognition ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-slate-950">模拟图片识别结果</h2>
            <span className="w-fit rounded-md bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
              MVP 模拟
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            当前结果由标题和类目模拟生成，不代表真实图片识别。接入 AI 识图后，该部分将由图片自动分析得到。
          </p>
          <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-700 sm:grid-cols-2">
            <p><strong className="text-slate-950">产品类型：</strong>{report.imageRecognition.productType}</p>
            <p><strong className="text-slate-950">类目：</strong>{report.imageRecognition.category}</p>
            <p><strong className="text-slate-950">主色：</strong>{report.imageRecognition.mainColors.join("、")}</p>
            <p><strong className="text-slate-950">产品结构：</strong>{report.imageRecognition.productStructure}</p>
            <p><strong className="text-slate-950">标准化程度：</strong>{report.imageRecognition.standardizationLevel}</p>
            <p><strong className="text-slate-950">使用场景：</strong>{report.imageRecognition.usageScenes.join("、")}</p>
            <p><strong className="text-slate-950">目标人群：</strong>{report.imageRecognition.targetUsers.join("、")}</p>
            <p><strong className="text-slate-950">图片点击潜力因素：</strong>{report.imageRecognition.clickPotentialFactors.join("、")}</p>
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-950">疑似爆款因素</h2>
          <p className="text-sm text-slate-500">系统只输出疑似因素，不强行判断确定原因。</p>
        </div>
        <div className="mt-4 space-y-3">
          {report.hotProductAnalysis.possibleWinningFactors.map((factor) => (
            <div key={`${factor.factor}-${factor.reason}`} className="rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700">
              <p className="font-medium text-slate-950">
                {factorLabelMap[factor.factor]} · 置信度：{confidenceLabelMap[factor.confidence]}
              </p>
              <p className="mt-1">{factor.reason}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">直接跟款风险</h2>
        {isHighRisk ? (
          <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800">
            直接跟款风险较高，不建议只改标题、图片或描述后上架。
          </div>
        ) : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-xs text-slate-500">风险等级</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">
              {riskLevelLabelMap[report.directCopyRisk.riskLevel]}
            </p>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-xs text-slate-500">风险分</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">{report.directCopyRisk.riskScore}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 text-sm leading-6 text-slate-600 lg:grid-cols-3">
          <div>
            <h3 className="font-semibold text-slate-950">风险原因</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {report.directCopyRisk.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-slate-950">风险警告</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {report.directCopyRisk.riskWarnings.length > 0 ? (
                report.directCopyRisk.riskWarnings.map((warning) => (
                  <li key={warning}>{getReadableWarning(warning)}</li>
                ))
              ) : (
                <li>当前未出现明显高风险警告，仍建议核对同款情况。</li>
              )}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-slate-950">降低风险建议</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {report.directCopyRisk.riskReductionSuggestions.length > 0 ? (
                report.directCopyRisk.riskReductionSuggestions.map((suggestion) => (
                  <li key={suggestion}>{suggestion}</li>
                ))
              ) : (
                <li>保留组合、升级、场景或人群细分等差异化方向。</li>
              )}
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">差异化推荐方向</h2>
          <p className="mt-1 text-sm text-slate-500">默认展示 3 个可测试方向，按当前综合推荐分和规则优先级排序。</p>
        </div>
        {report.recommendations.map((recommendation) => (
          <RecommendationCard key={recommendation.id} recommendation={recommendation} />
        ))}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">最终结论</h2>
        <p className="mt-3 text-sm leading-6 text-slate-700">{report.finalConclusion}</p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">操作建议</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">
          {report.actionSuggestions.map((suggestion) => (
            <li key={suggestion}>{suggestion}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
