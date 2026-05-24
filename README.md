# TEMU 核价选品助手

## 项目目标

上传爆款图片和商品基础数据，生成差异化选品方向，帮助 TEMU 卖家避免直接复制同款，提高核价通过率，并提升找到可售产品的概率。

## MVP 范围

第一版 MVP 聚焦以下能力：

1. 上传爆款图片。
2. 输入商品标题、类目、价格。
3. 可选输入周销量、月销量、评分、评论内容。
4. 输出图片识别结果、疑似爆款因素、反比价风险判断和差异化选品方向。
5. 默认输出 3 个推荐方向，高级模式输出 5 个推荐方向。
6. 输出结构化选品报告。

第一版不做自动上架、自动推广、浏览器插件、支付、登录、数据库后台、自动生图和完整利润计算。

## 本地启动方式

```bash
npm.cmd install
npm.cmd run dev
```

默认访问地址：

```text
http://localhost:3000
```

## 本地环境变量配置

1. 复制 `.env.example` 为 `.env.local`
2. 配置 `AI_PROVIDER`、`AI_API_KEY`、`AI_BASE_URL`、`AI_MODEL`
3. 配置 `ALLOWED_PHONE_NUMBERS`、`ADMIN_WECHAT` 和 `NEXT_PUBLIC_ADMIN_WECHAT`
4. 重启 `npm.cmd run dev`

支持的 AI Provider：

- `openai`
- `qwen`
- `doubao`
- `deepseek`

国内环境建议优先使用 `qwen` 或 `doubao`。DeepSeek 更适合文本推理，不优先用于图片识别。模型名和接口地址请以各平台控制台实际可用配置为准。

当前版本仍未接入真实图片上传。如 AI 调用失败，系统会自动使用 Mock 兜底分析。

当前 MVP 使用手机号白名单限制访问。`ALLOWED_PHONE_NUMBERS` 使用英文逗号分隔多个手机号，例如：`13800138000,13900139000`。

`ADMIN_WECHAT` 用于服务端手机号白名单接口提示；`NEXT_PUBLIC_ADMIN_WECHAT` 用于前端页面展示反馈微信。两者可以填写同一个微信号。

不要把 `.env.local` 提交到 Git。

## 部署环境变量

部署到 Vercel 或其他线上环境时，需要在部署平台的 Environment Variables 中配置：

```env
AI_PROVIDER=qwen
AI_API_KEY=your_api_key_here
AI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
AI_MODEL=qwen-plus
ALLOWED_PHONE_NUMBERS=13800138000,13900139000
ADMIN_WECHAT=your_wechat_id
NEXT_PUBLIC_ADMIN_WECHAT=your_wechat_id
```

可选 provider：

- `openai`
- `qwen`
- `doubao`
- `deepseek`

`OPENAI_API_KEY` 仅作为兼容旧配置使用。新配置优先使用 `AI_API_KEY`。

手机号白名单访问限制需要在线上环境配置：

- `ALLOWED_PHONE_NUMBERS`
- `ADMIN_WECHAT`
- `NEXT_PUBLIC_ADMIN_WECHAT`

未配置 `ALLOWED_PHONE_NUMBERS` 时，本地开发环境会放行；生产环境会拒绝访问并提示联系管理员。

`.env.local` 只用于本地开发，不应提交到 Git。线上环境变量应在部署平台后台配置，不要写入代码。

## 当前开发状态

当前处于 MVP 阶段，已具备基础演示和部署条件。

已完成：

- 规则版选品分析流程
- AI 分析接口 `/api/analyze`
- 多 AI Provider 配置：`openai`、`qwen`、`doubao`、`deepseek`
- AI JSON 解析和中文报告后处理
- Mock fallback：AI 配置缺失或调用失败时仍可生成报告
- 复制报告
- 导出 Markdown
- 清空表单
- 重新分析

当前版本未接入：

- 真实图片上传
- 数据库
- 登录
- 支付
- 自动上架
- 自动推广


