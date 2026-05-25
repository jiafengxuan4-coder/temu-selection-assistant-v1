import type { ProductInput, RecognizedProductFields } from "@/types/product";

type RecognizedFieldsPanelProps = {
  recognizedFields?: RecognizedProductFields;
  manualProduct?: ProductInput | null;
};

const confidenceLabelMap: Record<NonNullable<RecognizedProductFields["confidence"]>, string> = {
  high: "高",
  medium: "中",
  low: "低",
  unknown: "未知"
};

const priceSourceLabelMap: Record<string, string> = {
  final_price: "到手价",
  estimated_price: "预估价",
  coupon_price: "券后价",
  discount_price: "折扣价",
  current_sale_price: "当前售价",
  previous_price: "前价",
  original_price: "原价",
  strikethrough_price: "划线原价",
  other: "其他价格",
  uncertain: "不确定"
};

function formatValue(value: string | number | undefined): string {
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "未识别";
  }

  return value !== undefined && value.trim().length > 0 ? value : "未识别";
}

function hasManualValue(value: string | number | undefined): boolean {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0;
  }

  return value !== undefined && value.trim().length > 0;
}

function formatRecognizedPrice(recognizedFields: RecognizedProductFields): string | number | undefined {
  if (recognizedFields.priceDisplay && recognizedFields.priceDisplay.trim().length > 0) {
    return recognizedFields.priceDisplay;
  }

  return recognizedFields.price;
}

function formatPriceSource(source: string | undefined): string {
  return source ? priceSourceLabelMap[source] ?? source : "未识别";
}
function formatCategorySource(source: RecognizedProductFields["categorySource"]): string {
  switch (source) {
    case "manual":
      return "手动填写";
    case "recognized":
      return "来自图片识别";
    case "inferred":
      return "根据商品标题推断";
    default:
      return "未识别";
  }
}

function FieldRow({
  label,
  value,
  manualValue,
  detail
}: {
  label: string;
  value: string | number | undefined;
  manualValue?: string | number;
  detail?: string;
}) {
  const formattedValue = formatValue(value);
  const manualWins = hasManualValue(manualValue);

  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{formattedValue}</p>
      {detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}
      <p className="mt-1 text-xs text-slate-500">
        {formattedValue === "未识别" ? "未识别" : "来自图片识别"}
        {manualWins ? "；当前报告优先采用手动填写值" : ""}
      </p>
    </div>
  );
}

export function RecognizedFieldsPanel({
  recognizedFields,
  manualProduct
}: RecognizedFieldsPanelProps) {
  if (!recognizedFields) {
    return null;
  }

  const confidence = recognizedFields.confidence ?? "unknown";
  const warnings = recognizedFields.warnings ?? [];

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-950">AI 图片参考识别结果</h2>
        <p className="text-sm leading-6 text-slate-500">
          以下信息由上传图片辅助识别得到；图片也会作为产品参考素材使用。手动填写字段会优先于识别结果。
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {recognizedFields.imageCount ? (
          <div className="rounded-md bg-slate-50 p-3 sm:col-span-2">
            <p className="text-xs font-medium text-slate-500">综合识别截图数</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{recognizedFields.imageCount} 张</p>
            <p className="mt-1 text-xs text-slate-500">来自本次上传的产品相关图片</p>
          </div>
        ) : null}
        <FieldRow label="商品标题" value={recognizedFields.title} manualValue={manualProduct?.title} />
        <FieldRow
          label="商品类目"
          value={recognizedFields.category}
          manualValue={manualProduct?.category}
          detail={`来源：${formatCategorySource(recognizedFields.categorySource)}`}
        />
        <FieldRow
          label="商品价格"
          value={formatRecognizedPrice(recognizedFields)}
          manualValue={manualProduct?.price}
          detail={[
            recognizedFields.priceCurrency ? `币种：${recognizedFields.priceCurrency}` : "",
            `价格来源：${formatPriceSource(recognizedFields.priceSource)}`
          ].filter(Boolean).join("；")}
        />
        <FieldRow label="周销量" value={recognizedFields.weeklySales} manualValue={manualProduct?.weeklySales} />
        <FieldRow label="月销量" value={recognizedFields.monthlySales} manualValue={manualProduct?.monthlySales} />
        <FieldRow label="商品评分" value={recognizedFields.rating} manualValue={manualProduct?.rating} />
        <FieldRow label="评论内容" value={recognizedFields.reviewsText} manualValue={manualProduct?.reviewsText} />
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-500">识别置信度</p>
          <p className="mt-1 text-sm font-medium text-slate-900">{confidenceLabelMap[confidence]}</p>
          <p className="mt-1 text-xs text-slate-500">来自图片识别</p>
        </div>
      </div>

      {recognizedFields.priceCandidates && recognizedFields.priceCandidates.length > 0 ? (
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-medium text-slate-900">识别到的价格候选</p>
          <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-700">
            {recognizedFields.priceCandidates.map((candidate, index) => (
              <li key={`${candidate.display}-${candidate.value}-${index}`}>
                {candidate.display || candidate.value}：{formatPriceSource(candidate.source)}
                {candidate.reason ? `，${candidate.reason}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {warnings.length > 0 ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-900">识别提示</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-amber-800">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
