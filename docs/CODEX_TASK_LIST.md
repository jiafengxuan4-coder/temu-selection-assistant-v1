# CODEX_TASK_LIST.md

## 开发原则

本项目采用小步快跑方式开发。

Codex 每次只执行一个 Task，不允许一次性实现多个大功能。

每个 Task 必须遵守：

1. 只修改任务指定范围内的文件。
2. 不主动重构无关代码。
3. 不新增无关依赖。
4. 不接入未要求的 API。
5. 不实现未列入当前 Task 的功能。
6. 如果缺少信息，先做最小合理实现。
7. 完成后输出修改文件、实现内容、测试结果、未完成事项。

## Task 001：初始化项目和业务文档

目标：

完成 Next.js 项目初始化，并落地业务文档。

已完成内容应包括：

1. Next.js + TypeScript + Tailwind 项目。
2. App Router。
3. docs/MVP_SCOPE.md。
4. docs/BUSINESS_RULES.md。
5. docs/CODEX_TASK_LIST.md。
6. README.md。
7. src/lib、src/types、src/components 目录。

验收标准：

1. 项目可以 npm run dev 启动。
2. localhost:3000 可以访问。
3. docs 目录下存在三份核心文档。
4. README.md 能说明项目目标和启动方式。

当前状态：

本地项目已创建并可运行。
当前 Task 需要完成文档落地和目录整理。

## Task 002：定义 MVP 数据类型

目标：

创建第一版 MVP 的核心 TypeScript 类型。

建议创建文件：

- src/types/product.ts
- src/types/analysis.ts
- src/types/recommendation.ts

需要定义：

1. ProductInput
2. OptionalProductMetrics
3. ImageRecognitionResult
4. HotProductFactor
5. PriceComparisonRisk
6. RecommendationDirection
7. RecommendationScore
8. AnalysisReport

要求：

1. 类型命名清晰。
2. 字段必须和 MVP_SCOPE.md、BUSINESS_RULES.md 对齐。
3. 可选字段必须使用 optional。
4. 不写 UI。
5. 不接 API。
6. 不实现复杂业务逻辑。

验收标准：

1. 类型文件可以被正常 import。
2. TypeScript 不报错。
3. 字段覆盖 MVP 必填和选填输入。
4. 字段覆盖输出报告结构。

## Task 003：创建图片识别结果类型

目标：

定义 AI 图片识别后应该输出的结构。

建议文件：

- src/types/imageRecognition.ts

需要包含：

1. 产品类型
2. 产品类目
3. 主色
4. 辅助色
5. 款式描述
6. 是否为单品
7. 是否为组合产品
8. 是否有配件
9. 使用场景
10. 图片风格
11. 点击潜力因素
12. 无法识别字段
13. 置信度

要求：

1. 只定义类型。
2. 不接 OpenAI API。
3. 不写页面。
4. 不写图片上传。

验收标准：

1. 类型完整。
2. 能支持后续图片分析 API 输出。
3. 能表达 unknown 信息。

## Task 004：创建爆款因素分析规则模块

目标：

创建纯规则模块，用于根据输入数据判断疑似爆款因素。

建议文件：

- src/lib/hotProductFactorAnalyzer.ts

输入：

- 商品标题
- 商品类目
- 商品价格
- 周销量，可选
- 月销量，可选
- 评分，可选
- 评论内容，可选
- 图片识别结果

输出：

- hotProductType
- possibleWinningFactors
- unknownFactors
- confidenceLevel
- notes

要求：

1. 写纯函数。
2. 不接 OpenAI API。
3. 不编造销量、评分、评论。
4. 如果字段缺失，输出 unknown 或 low confidence。
5. 不写 UI。

验收标准：

1. 能识别价格因素、颜色因素、款式因素、图片点击率因素、综合因素、未知因素。
2. 每个因素包含 factor、confidence、reason。
3. 缺少评论时不会输出评论痛点结论。
4. 缺少销量时会降低销售相关置信度。

## Task 005：创建比价风险分析规则模块

目标：

创建纯规则模块，用于判断直接跟款和推荐方向的比价风险。

建议文件：

- src/lib/priceComparisonRiskAnalyzer.ts

输入：

- 产品标准化程度
- 产品结构：单品 / 组合 / 多件套
- 是否容易 1688 找同款，可选
- 是否有组合
- 是否有功能升级
- 是否有人群细分
- 是否有场景变化
- 是否有材质 / 颜色 / 规格差异

输出：

- riskLevel: high / medium / low
- riskScore
- reasons
- riskWarnings
- riskReductionSuggestions

要求：

1. 写纯函数。
2. 不接 API。
3. 不保证一定通过核价。
4. 输出原因要可读。

验收标准：

1. 标品直接跟款输出高风险。
2. 半标品单品建议组合降风险。
3. 组合产品建议升级降风险。
4. 有功能升级、组合、人群细分时风险降低。
5. 输出不包含“保证通过核价”等绝对表达。

## Task 006：创建推荐方向生成模块

目标：

根据爆款分析结果生成差异化选品方向。

建议文件：

- src/lib/recommendationGenerator.ts

输入：

- 商品基础信息
- 产品标准化程度
- 产品结构
- 爆款因素
- 比价风险结果
- 评论内容，可选

输出：

- 默认模式：3 个推荐方向
- 高级模式：5 个推荐方向

推荐方向类型：

1. 组合款方向
2. 功能升级方向
3. 场景 / 人群细分方向
4. 评论痛点改良方向
5. 图片表达迁移方向

要求：

1. 输入是单品时，优先推荐组合款。
2. 输入是组合产品时，优先推荐升级款。
3. 标品默认谨慎。
4. 非标品重点考虑款式、颜色、图片、人群。
5. 不为了凑数量输出低质量方向。
6. 不接 API。
7. 不写 UI。

验收标准：

1. 单品输入默认第一推荐是组合款。
2. 组合输入默认第一推荐是升级款。
3. 默认模式最多输出 3 个。
4. 高级模式最多输出 5 个。
5. 每个方向包含推荐理由、降低比价风险原因、销售机会、潜在风险。

## Task 007：创建推荐评分模块

目标：

为每个推荐方向计算销售潜力分、核价通过分、综合推荐分。

建议文件：

- src/lib/recommendationScoring.ts

评分公式：

综合推荐分 = 销售潜力分 × 40% + 核价通过分 × 60%

推荐等级：

- 80-100：推荐优先测试
- 60-79：可以小批量测试
- 40-59：谨慎，不建议优先做
- 0-39：不建议做

要求：

1. 写纯函数。
2. 分数范围 0-100。
3. 不做利润计算。
4. 不保证一定通过核价。
5. 不保证一定能爆。

验收标准：

1. 综合分公式正确。
2. 推荐等级正确。
3. 缺少销量、评分、评论时可以降低置信度。
4. 输出包含评分理由。

## Task 008：创建单页面输入表单

目标：

创建第一版 MVP 的用户输入页面。

建议文件：

- src/app/page.tsx
- src/components/ProductInputForm.tsx

输入字段：

必填：

1. 爆款图片
2. 商品标题
3. 商品类目
4. 商品价格

选填：

1. 周销量
2. 月销量
3. 商品评分
4. 评论内容

要求：

1. 页面简洁。
2. 不接 OpenAI API。
3. 不做真实图片上传，可以先用本地预览或占位。
4. 表单提交后可以先使用 mock 数据生成报告。
5. 不做登录。
6. 不做数据库。

验收标准：

1. 页面可以输入必填和选填字段。
2. 必填字段为空时有提示。
3. 表单提交不会报错。
4. 可以触发 mock 分析流程。

## Task 009：创建报告展示组件

目标：

创建结构化报告展示组件。

建议文件：

- src/components/AnalysisReportView.tsx
- src/components/RecommendationCard.tsx
- src/components/ScoreBadge.tsx

报告内容：

1. 爆款基础信息
2. 图片识别结果
3. 疑似爆款因素
4. 爆款类型
5. 数据完整度提示
6. 直接跟款风险
7. 差异化选品方向
8. 每个方向评分
9. 最终推荐结论
10. 操作建议

要求：

1. 使用 mock 数据展示。
2. 不接 API。
3. 不做复杂 UI。
4. 信息要清晰可读。

验收标准：

1. 能展示 3 个默认推荐方向。
2. 能展示销售潜力分、核价通过分、综合推荐分。
3. 能展示推荐等级。
4. 能展示数据缺失提示。
5. 能展示不建议直接复制同款的原因。

## Task 010：接入 OpenAI 结构化分析 API

目标：

在前面纯规则模块稳定后，再接入 OpenAI API。

建议文件：

- src/lib/ai/analyzeProductImage.ts
- src/lib/ai/analyzeHotProduct.ts
- src/app/api/analyze/route.ts

要求：

1. API Key 从环境变量 OPENAI_API_KEY 读取。
2. 不在前端暴露 API Key。
3. 使用结构化 JSON 输出。
4. 图片识别输出必须符合类型定义。
5. 爆款分析输出必须符合报告结构。
6. 不得编造销量、评分、评论。
7. 无法判断的信息输出 unknown。
8. 做错误处理。

验收标准：

1. 没有 OPENAI_API_KEY 时给出明确错误。
2. API 返回结构化 JSON。
3. 前端可以调用分析接口。
4. 分析结果可以展示到报告页。
5. 不出现未定义字段导致页面崩溃。

## Task 011：支持复制报告

目标：

允许用户一键复制报告文本。

建议文件：

- src/lib/reportFormatter.ts
- src/components/CopyReportButton.tsx

要求：

1. 将结构化报告转换成可读中文文本。
2. 支持复制到剪贴板。
3. 不做 PDF。
4. 不做复杂导出。

验收标准：

1. 点击按钮可以复制报告。
2. 复制内容包含推荐方向和评分。
3. 复制内容适合发给运营或学员查看。

## Task 012：支持导出 Markdown

目标：

允许用户导出 Markdown 格式报告。

建议文件：

- src/lib/exportMarkdown.ts
- src/components/ExportMarkdownButton.tsx

要求：

1. 根据报告生成 Markdown。
2. 文件名包含商品标题和日期。
3. 不做 PDF。
4. 不做 Excel。

验收标准：

1. 点击按钮可以下载 .md 文件。
2. Markdown 内容结构清晰。
3. 包含爆款分析、比价风险、推荐方向和评分。
