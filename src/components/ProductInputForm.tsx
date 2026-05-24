"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { ImageUploadPreview } from "@/components/ImageUploadPreview";
import type { ProductInput } from "@/types/product";

type ProductInputFormProps = {
  onSubmit: (product: ProductInput) => void;
  onClear?: () => void;
  onDraftChange?: (product: ProductInput | null) => void;
  isSubmitting?: boolean;
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

type ImageState = {
  imageBase64?: string;
  imageMimeType?: string;
  imageFileName?: string;
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

const petLeashExample: FormState = {
  title: "Reflective dog leash",
  category: "宠物用品",
  price: "9.99",
  weeklySales: "300",
  monthlySales: "1200",
  rating: "4.6",
  reviewsText:
    "The leash is strong and useful for walking dogs at night. Some buyers want a harness and poop bag holder included."
};

const allowedImageTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const maxImageSize = 5 * 1024 * 1024;

function toOptionalNumber(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : undefined;
}

function formatFileSize(size: number): string {
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function toProductInput(
  formState: FormState,
  imageState?: ImageState,
  allowIncomplete = false
): ProductInput | null {
  const title = formState.title.trim();
  const category = formState.category.trim();
  const price = Number(formState.price);
  const hasValidPrice = Number.isFinite(price) && price > 0;

  if ((!title || !category || !hasValidPrice) && !allowIncomplete) {
    return null;
  }

  return {
    title,
    category,
    price: hasValidPrice ? price : 0,
    weeklySales: toOptionalNumber(formState.weeklySales),
    monthlySales: toOptionalNumber(formState.monthlySales),
    rating: toOptionalNumber(formState.rating),
    reviewsText: formState.reviewsText.trim() || undefined,
    imageBase64: imageState?.imageBase64,
    imageMimeType: imageState?.imageMimeType,
    imageFileName: imageState?.imageFileName
  };
}

export function ProductInputForm({
  onSubmit,
  onClear,
  onDraftChange,
  isSubmitting = false
}: ProductInputFormProps) {
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [error, setError] = useState<string>("");
  const [imageFileName, setImageFileName] = useState<string>("");
  const [imageFileSize, setImageFileSize] = useState<number>(0);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("");
  const [imageMimeType, setImageMimeType] = useState<string>("");
  const [imageBase64, setImageBase64] = useState<string>("");
  const [imageError, setImageError] = useState<string>("");

  function getImageState(nextBase64 = imageBase64, nextMimeType = imageMimeType, nextFileName = imageFileName): ImageState {
    return {
      imageBase64: nextBase64 || undefined,
      imageMimeType: nextMimeType || undefined,
      imageFileName: nextFileName || undefined
    };
  }

  function updateField(field: keyof FormState, value: string) {
    setFormState((current) => {
      const nextState = { ...current, [field]: value };
      onDraftChange?.(toProductInput(nextState, getImageState()));
      return nextState;
    });
  }

  function fillExampleCase() {
    setFormState(petLeashExample);
    setError("");
    onDraftChange?.(toProductInput(petLeashExample, getImageState()));
  }

  function clearForm() {
    setFormState(initialFormState);
    setError("");
    clearImage();
    onDraftChange?.(null);
    onClear?.();
  }

  function clearImage() {
    setImageFileName("");
    setImageFileSize(0);
    setImagePreviewUrl("");
    setImageMimeType("");
    setImageBase64("");
    setImageError("");
    onDraftChange?.(toProductInput(formState));
  }

  function handleImageChange(file: File | null) {
    setImageError("");

    if (!file) {
      return;
    }

    if (!allowedImageTypes.includes(file.type)) {
      clearImage();
      setImageError("仅支持上传 PNG、JPG、JPEG、WEBP 图片。");
      return;
    }

    if (file.size > maxImageSize) {
      clearImage();
      setImageError("图片过大，请上传 5MB 以内的截图。");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setImageError("图片读取失败，请重新选择截图。");
        return;
      }

      setImageFileName(file.name);
      setImageFileSize(file.size);
      setImageMimeType(file.type);
      setImageBase64(reader.result);
      setImagePreviewUrl(reader.result);
      onDraftChange?.(toProductInput(formState, getImageState(reader.result, file.type, file.name)));
    };

    reader.onerror = () => {
      clearImage();
      setImageError("图片读取失败，请重新选择截图。");
    };

    reader.readAsDataURL(file);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const hasImage = Boolean(imageBase64);
    const product = toProductInput(formState, getImageState(), hasImage);

    if (!product) {
      setError("请填写商品标题、商品类目，并确保商品价格大于 0；或先上传商品截图让系统尝试识别。");
      return;
    }

    setError("");
    onDraftChange?.(product);
    onSubmit(product);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-950">商品信息</h2>
        <p className="text-sm leading-6 text-slate-500">
          支持上传商品截图，系统会优先识别标题、价格、销量、评分等信息；识别不完整时可手动补充。
        </p>
      </div>

      <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={fillExampleCase}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
          >
            填充宠物牵引绳案例
          </button>
          <button
            type="button"
            onClick={clearForm}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            清空表单
          </button>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500">用于快速演示报告效果。</p>
      </div>

      <div className="mt-5 space-y-4">
        <ImageUploadPreview
          previewUrl={imagePreviewUrl}
          fileName={imageFileName}
          fileSizeText={imageFileSize ? formatFileSize(imageFileSize) : ""}
          error={imageError}
          onFileChange={handleImageChange}
          onRemove={clearImage}
        />

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
        disabled={isSubmitting}
        className="mt-5 w-full rounded-md bg-slate-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isSubmitting ? "正在生成报告..." : "生成差异化选品报告"}
      </button>
    </form>
  );
}
