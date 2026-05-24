"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import type { ProductInput } from "@/types/product";

type ProductInputFormProps = {
  onSubmit: (product: ProductInput) => void;
};

type FormState = {
  title: string;
  category: string;
  price: string;
  weeklySales: string;
  monthlySales: string;
  rating: string;
  reviewsText: string;
};

const initialFormState: FormState = {
  title: "",
  category: "",
  price: "",
  weeklySales: "",
  monthlySales: "",
  rating: "",
  reviewsText: ""
};

function toOptionalNumber(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : undefined;
}

export function ProductInputForm({ onSubmit }: ProductInputFormProps) {
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [error, setError] = useState<string>("");

  function updateField(field: keyof FormState, value: string) {
    setFormState((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = formState.title.trim();
    const category = formState.category.trim();
    const price = Number(formState.price);

    if (!title || !category || !Number.isFinite(price) || price <= 0) {
      setError("请填写商品标题、商品类目，并确保商品价格大于 0。");
      return;
    }

    setError("");
    onSubmit({
      title,
      category,
      price,
      weeklySales: toOptionalNumber(formState.weeklySales),
      monthlySales: toOptionalNumber(formState.monthlySales),
      rating: toOptionalNumber(formState.rating),
      reviewsText: formState.reviewsText.trim() || undefined
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-950">商品信息</h2>
        <p className="text-sm leading-6 text-slate-500">
          图片识别将在下一版接入，本版本先使用模拟图片识别结果。
        </p>
      </div>

      <div className="mt-5 space-y-4">
        <label className="block">
          <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
            商品标题
            <span className="rounded bg-slate-950 px-1.5 py-0.5 text-xs font-medium text-white">必填</span>
          </span>
          <input
            value={formState.title}
            onChange={(event) => updateField("title", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            placeholder="例如：Reflective dog leash"
          />
        </label>

        <label className="block">
          <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
            商品类目
            <span className="rounded bg-slate-950 px-1.5 py-0.5 text-xs font-medium text-white">必填</span>
          </span>
          <input
            value={formState.category}
            onChange={(event) => updateField("category", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            placeholder="例如：宠物用品"
          />
        </label>

        <label className="block">
          <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
            商品价格
            <span className="rounded bg-slate-950 px-1.5 py-0.5 text-xs font-medium text-white">必填</span>
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formState.price}
            onChange={(event) => updateField("price", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            placeholder="例如：9.99"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
              周销量
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">选填</span>
            </span>
            <input
              type="number"
              min="0"
              value={formState.weeklySales}
              onChange={(event) => updateField("weeklySales", event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>

          <label className="block">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
              月销量
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">选填</span>
            </span>
            <input
              type="number"
              min="0"
              value={formState.monthlySales}
              onChange={(event) => updateField("monthlySales", event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>
        </div>
        <p className="-mt-2 text-xs leading-5 text-slate-500">
          周销量/月销量可选；缺失时销售潜力判断置信度会降低。
        </p>

        <label className="block">
          <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
            商品评分
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">选填</span>
          </span>
          <input
            type="number"
            min="0"
            max="5"
            step="0.1"
            value={formState.rating}
            onChange={(event) => updateField("rating", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            placeholder="例如：4.6"
          />
        </label>

        <label className="block">
          <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
            评论内容
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">选填</span>
          </span>
          <textarea
            value={formState.reviewsText}
            onChange={(event) => updateField("reviewsText", event.target.value)}
            className="mt-1 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            placeholder="可粘贴部分评论，用于后续分析用户反馈。"
          />
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            评论可选；如果不填写，系统不会编造用户痛点。
          </span>
        </label>
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        className="mt-5 w-full rounded-md bg-slate-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
      >
        生成差异化选品报告
      </button>
    </form>
  );
}
