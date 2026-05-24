"use client";

type ImageUploadPreviewProps = {
  previewUrl: string;
  fileName: string;
  fileSizeText: string;
  error: string;
  onFileChange: (file: File | null) => void;
  onRemove: () => void;
};

export function ImageUploadPreview({
  previewUrl,
  fileName,
  fileSizeText,
  error,
  onFileChange,
  onRemove
}: ImageUploadPreviewProps) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-slate-900">上传商品截图</h3>
        <p className="text-xs leading-5 text-slate-500">
          上传 TEMU 商品截图后，后续版本将自动识别商品标题、价格、销量、评分等信息；当前版本先支持图片预览。
        </p>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        <label className="inline-flex w-fit cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100">
          选择截图
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="sr-only"
            onChange={(event) => {
              onFileChange(event.target.files?.[0] ?? null);
              event.currentTarget.value = "";
            }}
          />
        </label>

        <p className="text-xs leading-5 text-slate-500">支持 PNG、JPG、JPEG、WEBP，图片大小不超过 5MB。</p>

        {previewUrl ? (
          <div className="rounded-md border border-slate-200 bg-white p-3">
            <img
              src={previewUrl}
              alt="商品截图预览"
              className="max-h-60 w-full rounded border border-slate-200 object-contain"
            />
            <div className="mt-3 space-y-1 text-xs leading-5 text-slate-600">
              <p>
                <span className="font-medium text-slate-800">文件名：</span>
                {fileName}
              </p>
              <p>
                <span className="font-medium text-slate-800">文件大小：</span>
                {fileSizeText}
              </p>
            </div>
            <button
              type="button"
              onClick={onRemove}
              className="mt-3 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              移除图片
            </button>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              当前版本已接收截图预览，真实图片识别将在下一步接入。
            </p>
          </div>
        ) : null}

        {error ? <p className="text-xs leading-5 text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}
