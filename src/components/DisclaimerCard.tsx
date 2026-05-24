export function DisclaimerCard() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">免责声明</h2>
      <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
        <p>本工具用于 TEMU 选品和差异化方向分析辅助。</p>
        <p>报告不代表商品会成为爆款，也不代表可以通过核价。</p>
        <p>AI 识别可能出现误差，最终上架、核价、备货决策需人工判断。</p>
        <p>建议结合 1688 同款搜索、供应链报价、重量、物流成本和平台规则综合判断。</p>
        <p>不建议直接复制同款，建议优先考虑组合、升级、场景细分等差异化方向。</p>
      </div>
    </section>
  );
}
