export function UsageGuideCard() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">使用说明</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-600">
        <li>上传 1-5 张 TEMU 商品截图。</li>
        <li>建议截图包含商品标题、价格、销量、评分、评论或详情信息。</li>
        <li>系统会自动识别截图内容，并填入左侧表单。</li>
        <li>如果识别结果有误，可以直接手动修改表单字段。</li>
        <li>确认商品信息后，点击“生成差异化选品报告”。</li>
        <li>报告可以复制给学员、运营同事或客户，也可以导出 Markdown。</li>
      </ol>
    </section>
  );
}
