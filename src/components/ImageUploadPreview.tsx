"use client";

import type { ClipboardEvent } from "react";

type ImagePreviewItem = {
  previewUrl: string;
  fileName: string;
  fileSizeText: string;
};

type ImageUploadPreviewProps = {
  images: ImagePreviewItem[];
  error: string;
  onFilesChange: (files: FileList | null) => void;
  onPasteFiles: (files: File[]) => void;
  onRemove: (index: number) => void;
};

export function ImageUploadPreview({
  images,
  error,
  onFilesChange,
  onPasteFiles,
  onRemove
}: ImageUploadPreviewProps) {
  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const pastedFiles = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);

    if (pastedFiles.length === 0) {
      onPasteFiles([]);
      return;
    }

    event.preventDefault();
    onPasteFiles(pastedFiles);
  }

  return (
    <div
      className="rounded-md border border-slate-200 bg-slate-50 p-3 outline-none focus-within:border-slate-400 focus:border-slate-400"
      tabIndex={0}
      onPaste={handlePaste}
      onClick={(event) => event.currentTarget.focus()}
    >
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-900">上传产品相关图片</h3>
        <div className="space-y-1 text-xs leading-5 text-slate-500">
          <p>支持上传本地图片，也支持截图后 Ctrl + V 粘贴图片。系统会自动压缩较大的图片。</p>
          <p>支持最多 10 张，但建议优先上传 3-5 张关键图片。</p>
          <p>基础提交：至少 3 张图</p>
          <p>标准提交：建议 5-6 张图</p>
          <p>完整提交：最多 10 张图</p>
          <p>为了提升速度和成功率，建议优先上传：商品详情页截图、主产品图、SKU/规格局部截图、配件图、规格表图。</p>
          <p>图片越完整，AI 对产品结构、组合空间、配件关系、主图方向和标题卖点的判断越准确。</p>
          <p>如果需要识别颜色、尺码、规格，请尽量上传 SKU 区域或规格表的局部截图，整页截图中文字太小时可能识别不完整。</p>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        <label className="inline-flex w-fit cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100">
          选择图片
          <input
            type="file"
            multiple
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="sr-only"
            onChange={(event) => {
              onFilesChange(event.target.files);
              event.currentTarget.value = "";
            }}
          />
        </label>

        <p className="text-xs leading-5 text-slate-500">
          支持 PNG、JPG、JPEG、WEBP；单张原图不超过 5MB；压缩后单张不超过 2MB；总图量建议控制在 9MB 内。
        </p>
        <p className="text-xs leading-5 text-slate-500">
          颜色、尺码、规格信息建议单独截局部图上传，避免小字在整页截图中识别不完整。
        </p>

        {images.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {images.map((image, index) => (
              <div key={`${image.fileName}-${index}`} className="rounded-md border border-slate-200 bg-white p-3">
                <p className="mb-2 text-xs font-medium text-slate-700">截图 {index + 1}</p>
                <img
                  src={image.previewUrl}
                  alt={`产品图片预览 ${index + 1}`}
                  className="max-h-40 w-full rounded border border-slate-200 object-contain"
                />
                <div className="mt-3 space-y-1 text-xs leading-5 text-slate-600">
                  <p>
                    <span className="font-medium text-slate-800">文件名：</span>
                    {image.fileName}
                  </p>
                  <p>
                    <span className="font-medium text-slate-800">文件大小：</span>
                    {image.fileSizeText}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="mt-3 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  移除图片
                </button>
              </div>
            ))}
            <p className="text-xs leading-5 text-slate-500 sm:col-span-2">
              已接收 {images.length} 张图片，生成报告时会先综合识别图片中的商品信息。
            </p>
          </div>
        ) : null}

        {error ? <p className="text-xs leading-5 text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}
