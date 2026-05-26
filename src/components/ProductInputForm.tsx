"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ImageUploadPreview } from "@/components/ImageUploadPreview";
import type { ProductImageInput, ProductInput, RecognizedProductFields } from "@/types/product";

type ProductInputFormProps = {
  onSubmit: (product: ProductInput) => void;
  onClear?: () => void;
  onDraftChange?: (product: ProductInput | null) => void;
  isSubmitting?: boolean;
  recognizedFields?: RecognizedProductFields;
};

type FormState = {
  title: string;
  category: string;
  price: string;
  weeklySales: string;
  monthlySales: string;
  rating: string;
  reviewsText: string;
  mainProductSpec: string;
  accessorySpec: string;
  productSize: string;
  packageWeight: string;
  packageSize: string;
  colorSizeOptions: string;
};

type ImageState = ProductImageInput & {
  imageFileSize: number;
  imagePreviewUrl: string;
};

type PriceMetaState = Pick<ProductInput, "priceDisplay" | "priceCurrency" | "priceSource" | "priceCandidates">;

const initialFormState: FormState = {
  title: "",
  category: "",
  price: "",
  weeklySales: "",
  monthlySales: "",
  rating: "",
  reviewsText: "",
  mainProductSpec: "",
  accessorySpec: "",
  productSize: "",
  packageWeight: "",
  packageSize: "",
  colorSizeOptions: ""
};

const petLeashExample: FormState = {
  title: "Reflective dog leash",
  category: "宠物用品",
  price: "9.99",
  weeklySales: "300",
  monthlySales: "1200",
  rating: "4.6",
  reviewsText:
    "The leash is strong and useful for walking dogs at night. Some buyers want a harness and poop bag holder included.",
  mainProductSpec: "反光牵引绳，适合夜间遛狗场景",
  accessorySpec: "宠物背带、拾便袋收纳器",
  productSize: "",
  packageWeight: "",
  packageSize: "",
  colorSizeOptions: "黑色、橙色等可选颜色"
};

const allowedImageTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const maxImageSize = 5 * 1024 * 1024;
const maxCompressedImageSize = 2 * 1024 * 1024;
const maxImageCount = 10;
const maxTotalImageSize = 9 * 1024 * 1024;
const maxCompressedImageEdge = 1800;
const compressedImageQuality = 0.8;

function toOptionalNumber(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : undefined;
}

function toOptionalProductSpecs(formState: FormState): ProductInput["productSpecs"] | undefined {
  const productSpecs = {
    mainProductSpec: formState.mainProductSpec.trim() || undefined,
    accessorySpec: formState.accessorySpec.trim() || undefined,
    productSize: formState.productSize.trim() || undefined,
    packageWeight: formState.packageWeight.trim() || undefined,
    packageSize: formState.packageSize.trim() || undefined,
    colorSizeOptions: formState.colorSizeOptions.trim() || undefined
  };

  return Object.values(productSpecs).some(Boolean) ? productSpecs : undefined;
}
function formatFileSize(size: number): string {
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function getDataUrlSize(dataUrl: string): number {
  const base64 = dataUrl.includes(",") ? dataUrl.split(",").pop() ?? "" : dataUrl;
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.round((base64.length * 3) / 4 - padding));
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("图片读取失败，请重新选择截图。"));
    };
    image.src = objectUrl;
  });
}

async function compressImageFile(file: File): Promise<{ dataUrl: string; size: number; mimeType: string }> {
  const image = await loadImageFromFile(file);
  const scale = Math.min(1, maxCompressedImageEdge / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  if (scale === 1 && file.size <= maxCompressedImageSize && file.type !== "image/png") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result !== "string") {
          reject(new Error("图片读取失败，请重新选择截图。"));
          return;
        }

        resolve({
          dataUrl: reader.result,
          size: getDataUrlSize(reader.result),
          mimeType: file.type || "image/jpeg"
        });
      };
      reader.onerror = () => reject(new Error("图片读取失败，请重新选择截图。"));
      reader.readAsDataURL(file);
    });
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("图片压缩失败，请重新选择截图。");
  }

  context.drawImage(image, 0, 0, width, height);
  const dataUrl = canvas.toDataURL("image/jpeg", compressedImageQuality);

  return {
    dataUrl,
    size: getDataUrlSize(dataUrl),
    mimeType: "image/jpeg"
  };
}

function toProductInput(
  formState: FormState,
  imageStates: ImageState[] = [],
  allowIncomplete = false,
  priceMeta?: PriceMetaState
): ProductInput | null {
  const title = formState.title.trim();
  const category = formState.category.trim();
  const price = Number(formState.price);
  const hasValidPrice = Number.isFinite(price) && price > 0;
  const images = imageStates.map((image) => ({
    imageBase64: image.imageBase64,
    imageMimeType: image.imageMimeType,
    imageFileName: image.imageFileName
  }));

  if ((!title || !category || !hasValidPrice) && !allowIncomplete) {
    return null;
  }

  return {
    title,
    category,
    price: hasValidPrice ? price : 0,
    ...(hasValidPrice && priceMeta ? priceMeta : {}),
    weeklySales: toOptionalNumber(formState.weeklySales),
    monthlySales: toOptionalNumber(formState.monthlySales),
    rating: toOptionalNumber(formState.rating),
    reviewsText: formState.reviewsText.trim() || undefined,
    productSpecs: toOptionalProductSpecs(formState),
    images,
    imageBase64: images[0]?.imageBase64,
    imageMimeType: images[0]?.imageMimeType,
    imageFileName: images[0]?.imageFileName
  };
}

export function ProductInputForm({
  onSubmit,
  onClear,
  onDraftChange,
  isSubmitting = false,
  recognizedFields
}: ProductInputFormProps) {
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [error, setError] = useState<string>("");
  const [imageStates, setImageStates] = useState<ImageState[]>([]);
  const [imageError, setImageError] = useState<string>("");
  const [priceMeta, setPriceMeta] = useState<PriceMetaState | undefined>();
  const [autofillMessage, setAutofillMessage] = useState<string>("");
  const lastRecognizedSignatureRef = useRef<string>("");

  function updateField(field: keyof FormState, value: string) {
    setFormState((current) => ({ ...current, [field]: value }));

    if (field === "price") {
      setPriceMeta(undefined);
    }
  }

  function fillExampleCase() {
    setFormState(petLeashExample);
    setError("");
    setPriceMeta(undefined);
    setAutofillMessage("");
  }

  function clearImages() {
    setImageStates([]);
    setImageError("");
  }

  function clearForm() {
    setFormState(initialFormState);
    setError("");
    setPriceMeta(undefined);
    setAutofillMessage("");
    clearImages();
    onClear?.();
  }

  async function readImageFile(file: File): Promise<ImageState> {
    const compressedImage = await compressImageFile(file);

    if (compressedImage.size > maxCompressedImageSize) {
      throw new Error("图片过大，请裁剪关键区域后重新上传。");
    }

    return {
      imageBase64: compressedImage.dataUrl,
      imageMimeType: compressedImage.mimeType,
      imageFileName: file.name,
      imageFileSize: compressedImage.size,
      imagePreviewUrl: compressedImage.dataUrl
    };
  }

  async function addImageFiles(files: File[], options?: { allowPartialWhenFull?: boolean; emptyMessage?: string }) {
    setImageError("");

    if (files.length === 0) {
      if (options?.emptyMessage) {
        setImageError(options.emptyMessage);
      }
      return;
    }

    if (files.some((file) => !allowedImageTypes.includes(file.type))) {
      setImageError("仅支持上传 PNG、JPG、JPEG、WEBP 图片。");
      return;
    }

    if (files.some((file) => file.size > maxImageSize)) {
      setImageError("图片过大，请上传 5MB 以内的截图。");
      return;
    }

    const availableSlots = maxImageCount - imageStates.length;

    if (availableSlots <= 0) {
      setImageError("最多支持上传 10 张图片。");
      return;
    }

    if (files.length > availableSlots && !options?.allowPartialWhenFull) {
      setImageError("最多支持上传 10 张截图，请删除部分图片后重试。");
      return;
    }

    const filesToAdd = options?.allowPartialWhenFull ? files.slice(0, availableSlots) : files;

    try {
      const nextImages = [...imageStates, ...(await Promise.all(filesToAdd.map(readImageFile)))];
      const totalSize = nextImages.reduce((sum, image) => sum + image.imageFileSize, 0);

      if (totalSize > maxTotalImageSize) {
        setImageError("当前图片总量较大，可能导致分析失败。建议保留 3-5 张关键图片后再生成报告。");
        return;
      }

      setImageStates(nextImages);

      if (files.length > filesToAdd.length) {
        setImageError("最多支持上传 10 张图片。已添加可加入的图片，其余图片未添加。");
      }
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "图片读取失败，请重新选择截图。");
    }
  }

  async function handleImagesChange(fileList: FileList | null) {
    await addImageFiles(Array.from(fileList ?? []));
  }

  async function handlePasteImages(files: File[]) {
    await addImageFiles(files, {
      allowPartialWhenFull: true,
      emptyMessage: "剪贴板中未检测到图片。"
    });
  }

  function removeImage(index: number) {
    const nextImages = imageStates.filter((_, currentIndex) => currentIndex !== index);
    setImageStates(nextImages);
    setImageError("");
  }


  useEffect(() => {
    const allowIncomplete = imageStates.length > 0;
    onDraftChange?.(toProductInput(formState, imageStates, allowIncomplete, priceMeta));
  }, [formState, imageStates, priceMeta, onDraftChange]);

  useEffect(() => {
    if (!recognizedFields) {
      lastRecognizedSignatureRef.current = "";
      return;
    }

    const signature = JSON.stringify({
      title: recognizedFields.title,
      rawRecognizedTitle: recognizedFields.rawRecognizedTitle,
      cleanedProductName: recognizedFields.cleanedProductName,
      category: recognizedFields.category,
      price: recognizedFields.price,
      priceDisplay: recognizedFields.priceDisplay,
      priceCurrency: recognizedFields.priceCurrency,
      priceSource: recognizedFields.priceSource,
      priceCandidates: recognizedFields.priceCandidates,
      weeklySales: recognizedFields.weeklySales,
      monthlySales: recognizedFields.monthlySales,
      rating: recognizedFields.rating,
      reviewsText: recognizedFields.reviewsText,
      recognizedSpecInfo: recognizedFields.recognizedSpecInfo,
      recognizedSizeInfo: recognizedFields.recognizedSizeInfo,
      recognizedColorStyleInfo: recognizedFields.recognizedColorStyleInfo,
      recognizedWeightDimensionInfo: recognizedFields.recognizedWeightDimensionInfo,
      missingFields: recognizedFields.missingFields
    });

    if (lastRecognizedSignatureRef.current === signature) {
      return;
    }

    lastRecognizedSignatureRef.current = signature;
    const nextState = { ...formState };
    let filledCount = 0;
    let nextPriceMeta = priceMeta;

    const fillTextField = (field: keyof FormState, value: string | undefined) => {
      if (nextState[field].trim().length === 0 && value && value.trim().length > 0) {
        nextState[field] = value.trim();
        filledCount += 1;
      }
    };

    const fillNumberField = (field: keyof FormState, value: number | undefined) => {
      if (nextState[field].trim().length === 0 && typeof value === "number" && Number.isFinite(value)) {
        nextState[field] = String(value);
        filledCount += 1;
      }
    };

    fillTextField("title", recognizedFields.rawRecognizedTitle ?? recognizedFields.title);
    fillTextField("category", recognizedFields.category);

    if (nextState.price.trim().length === 0 && typeof recognizedFields.price === "number" && Number.isFinite(recognizedFields.price)) {
      nextState.price = String(recognizedFields.price);
      filledCount += 1;
      nextPriceMeta = {
        priceDisplay: recognizedFields.priceDisplay,
        priceCurrency: recognizedFields.priceCurrency,
        priceSource: recognizedFields.priceSource,
        priceCandidates: recognizedFields.priceCandidates
      };
      setPriceMeta(nextPriceMeta);
    }

    fillNumberField("weeklySales", recognizedFields.weeklySales);
    fillNumberField("monthlySales", recognizedFields.monthlySales);
    fillNumberField("rating", recognizedFields.rating);
    fillTextField("reviewsText", recognizedFields.reviewsText);
    fillTextField("mainProductSpec", recognizedFields.recognizedSpecInfo);
    fillTextField("productSize", recognizedFields.recognizedSizeInfo);
    fillTextField("packageSize", recognizedFields.recognizedWeightDimensionInfo);
    fillTextField("colorSizeOptions", recognizedFields.recognizedColorStyleInfo);

    const hasMissingFields = Boolean(recognizedFields.missingFields?.length);
    setAutofillMessage(
      filledCount > 0
        ? hasMissingFields
          ? "已将图片识别结果自动填入表单；部分字段未识别，图片会作为产品参考素材使用，可手动补充后继续生成报告。"
          : "已将图片识别结果自动填入表单，如有错误可直接手动修改。"
        : hasMissingFields
          ? "未从图片中识别到完整商品信息，系统已将这些图片作为产品参考素材使用。请补充商品标题、类目、价格等基础信息后继续生成报告。"
          : "图片识别结果已返回，当前表单优先保留已填写内容；图片将作为产品参考素材使用。"
    );
    setFormState(nextState);
  }, [recognizedFields, formState, priceMeta]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const hasImages = imageStates.length > 0;
    const totalImageSize = imageStates.reduce((sum, image) => sum + image.imageFileSize, 0);

    if (totalImageSize > maxTotalImageSize) {
      setError("当前图片总量较大，可能导致分析失败。建议保留 3-5 张关键图片后再生成报告。");
      return;
    }

    const product = toProductInput(formState, imageStates, hasImages, priceMeta);

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
          请上传产品相关图片，最多支持 10 张，但建议优先上传 3-5 张关键图片。支持截图后直接 Ctrl + V 粘贴图片，也可以点击选择本地图片上传。
          图片越完整，AI 对产品结构、组合空间、配件关系、主图方向和标题卖点的判断越准确。
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
        {autofillMessage ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-800">
            {autofillMessage}
          </div>
        ) : null}

        <ImageUploadPreview
          images={imageStates.map((image) => ({
            previewUrl: image.imagePreviewUrl,
            fileName: image.imageFileName,
            fileSizeText: formatFileSize(image.imageFileSize)
          }))}
          error={imageError}
          onFilesChange={handleImagesChange}
          onPasteFiles={handlePasteImages}
          onRemove={removeImage}
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

        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-900">产品规格信息</h3>
            <p className="text-xs leading-5 text-slate-500">
              规格信息越完整，AI 越容易生成准确的规格图和详情图。请按原始规格填写，系统会尽量自动换算为适合海外平台展示的单位。请不要填写不确定的数据。
            </p>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-slate-600">主产品规格</span>
              <input value={formState.mainProductSpec} onChange={(event) => updateField("mainProductSpec", event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500" placeholder="例如：Chest: 50-60 cm; Neck: 40-48 cm" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-600">配件规格</span>
              <input value={formState.accessorySpec} onChange={(event) => updateField("accessorySpec", event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500" placeholder="例如：Leash length: 1.5 m; Poop bag roll: 1 roll" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-600">产品尺寸</span>
              <input value={formState.productSize} onChange={(event) => updateField("productSize", event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500" placeholder="例如：30 x 20 x 10 cm" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-600">包装重量</span>
              <input value={formState.packageWeight} onChange={(event) => updateField("packageWeight", event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500" placeholder="例如：278 g" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-600">包装尺寸</span>
              <input value={formState.packageSize} onChange={(event) => updateField("packageSize", event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500" placeholder="例如：35 x 25 x 8 cm" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-600">颜色/尺码选项</span>
              <input value={formState.colorSizeOptions} onChange={(event) => updateField("colorSizeOptions", event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500" placeholder="例如：Purple, Black; S / M / L" />
            </label>
          </div>
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-5 w-full rounded-md bg-slate-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isSubmitting ? "正在生成报告，图片较多时可能需要 60-90 秒..." : "生成差异化选品报告"}
      </button>
    </form>
  );
}
