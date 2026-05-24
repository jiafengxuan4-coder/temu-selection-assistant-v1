const feedbackWechat = process.env.NEXT_PUBLIC_ADMIN_WECHAT?.trim();

export function FeedbackCard() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">问题反馈 / 开通咨询</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        如识别异常、报告不准确或需要开通使用权限，请联系管理员微信。
      </p>
      <p className="mt-2 text-sm font-medium text-slate-900">
        {feedbackWechat ? `管理员微信：${feedbackWechat}` : "请联系管理员微信。"}
      </p>
    </section>
  );
}
