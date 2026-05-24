"use client";

type ImagePreviewItem = {
  previewUrl: string;
  fileName: string;
  fileSizeText: string;
};

type ImageUploadPreviewProps = {
  images: ImagePreviewItem[];
  error: string;
  onFilesChange: (files: FileList | null) => void;
  onRemove: (index: number) => void;
};

export function ImageUploadPreview({
  images,
  error,
  onFilesChange,
  onRemove
}: ImageUploadPreviewProps) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-slate-900">上传商品截图</h3>
        <p className="text-xs leading-5 text-slate-500">
          可上传 1-5 张 TEMU 商品截图，系统会综合识别标题、价格、销量、评分等信息；识别不完整时可手动补充。
        </p>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        <label className="inline-flex w-fit cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100">
          选择截图
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
          支持 PNG、JPG、JPEG、WEBP；单张图片不超过 5MB，最多 5 张。
        </p>

        {images.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {images.map((image, index) => (
              <div key={`${image.fileName}-${index}`} className="rounded-md border border-slate-200 bg-white p-3">
                <p className="mb-2 text-xs font-medium text-slate-700">截图 {index + 1}</p>
                <img
                  src={image.previewUrl}
                  alt={`商品截图预览 ${index + 1}`}
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
              已接收 {images.length} 张截图，生成报告时会先综合识别截图中的商品信息。
            </p>
          </div>
        ) : null}

        {error ? <p className="text-xs leading-5 text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}
