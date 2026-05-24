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
  const manualWins = hasManualValue(manualValue);

  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{formatValue(value)}</p>
      {detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}
      <p className="mt-1 text-xs text-slate-500">
        {formatValue(value) === "未识别" ? "未识别" : "来自截图识别"}
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
        <h2 className="text-lg font-semibold text-slate-950">AI 截图识别结果</h2>
        <p className="text-sm leading-6 text-slate-500">
          以下信息由截图识别得到，建议生成报告前人工核对；手动填写字段会优先于识别结果。
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <FieldRow label="商品标题" value={recognizedFields.title} manualValue={manualProduct?.title} />
        <FieldRow label="商品类目" value={recognizedFields.category} manualValue={manualProduct?.category} />
        <FieldRow
          label="商品价格"
          value={formatRecognizedPrice(recognizedFields)}
          manualValue={manualProduct?.price}
          detail={recognizedFields.priceCurrency ? `\u5e01\u79cd\uff1a${recognizedFields.priceCurrency}` : undefined}
        />
        <FieldRow label="周销量" value={recognizedFields.weeklySales} manualValue={manualProduct?.weeklySales} />
        <FieldRow label="月销量" value={recognizedFields.monthlySales} manualValue={manualProduct?.monthlySales} />
        <FieldRow label="商品评分" value={recognizedFields.rating} manualValue={manualProduct?.rating} />
        <FieldRow label="评论内容" value={recognizedFields.reviewsText} manualValue={manualProduct?.reviewsText} />
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-500">识别置信度</p>
          <p className="mt-1 text-sm font-medium text-slate-900">{confidenceLabelMap[confidence]}</p>
          <p className="mt-1 text-xs text-slate-500">来自截图识别</p>
        </div>
      </div>

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
