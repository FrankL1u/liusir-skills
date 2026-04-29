# 图片风格配置表

这份配置表对应仓库级公共图片风格系统，机器可读配置位于 `references/visual-prompt-system.md`。

全局主体约束：

- 禁止写实人物、真实脸部、真实手部和真人肖像式构图
- 允许非写实角色，只在确有表达需要时使用
- 优先使用结构、符号、图标、模块、物体关系来表达观点，而不是人物表演

## 总原则

1. 同一篇文章只选一个主风格
2. 封面图与正文图共享同一主风格
3. 封面图使用 `cover_type × style`
4. 正文图使用 `inline_type × style`
5. 默认优先使用结构表达能力更强、稳定性更高的风格：
   - `editorial`
   - `blueprint`
   - `lofi-doodle`
   - `notebook-sketch`
   - `scientific`

## 封面类型

| key | 中文 | 说明 |
| --- | --- | --- |
| `hero` | 主视觉 | 单一强主体，适合封面第一眼识别 |
| `conceptual` | 概念主视觉 | 用一个核心隐喻表达文章判断 |
| `typography` | 字标题海报 | 以标题和版式为主，图像辅助 |
| `metaphor` | 隐喻封面 | 用物体关系或视觉隐喻表达主题 |
| `scene` | 场景封面 | 以一个工作或叙事场景定调 |
| `minimal` | 极简封面 | 留白和单一元素为主 |

## 正文图类型

| key | 中文 | 说明 |
| --- | --- | --- |
| `infographic` | 信息图 | 数据、指标、模块摘要 |
| `scene` | 场景图 | 氛围插图、叙事段落配图 |
| `flowchart` | 流程图 | 步骤、链路、工作流 |
| `comparison` | 对比图 | 并排比较、前后差异 |
| `framework` | 框架图 | 概念关系、系统结构、方法论 |
| `timeline` | 时间线 | 进展、演化、阶段变化 |

## 风格配置表

| key | 中文 | 封面推荐 | 正文图推荐 | 适用说明 |
| --- | --- | --- | --- | --- |
| `notion` | 极简手绘线条风 | `conceptual`, `minimal` | `framework`, `flowchart`, `comparison` | 知识分享、SaaS、生产力、轻结构化解释 |
| `warm` | 温暖亲和风 | `scene`, `metaphor` | `scene`, `comparison` | 个人叙事、轻解释、带人味但不写实 |
| `blueprint` | 技术蓝图风 | `conceptual`, `hero` | `framework`, `flowchart`, `comparison` | 架构、系统设计、Agent 工作流、工程主题 |
| `watercolor` | 水彩柔和风 | `scene`, `metaphor` | `scene`, `framework` | 柔和叙事、创意表达、非硬核技术文章 |
| `editorial` | 杂志信息图风 | `conceptual`, `metaphor`, `hero` | `framework`, `comparison`, `flowchart`, `infographic` | 方法论、趋势判断、工具分析的主风格 |
| `scientific` | 学术精确图表风 | `conceptual` | `framework`, `flowchart`, `comparison`, `infographic` | 严谨分析、结构化拆解、图表化表达 |
| `lofi-doodle` | 低保真手绘涂鸦风 | `conceptual`, `metaphor` | `framework`, `flowchart`, `comparison` | 白板感、脑图感、思路草稿式表达 |
| `multi-panel-manga` | 多格漫画说明风 | `scene`, `hero` | `scene`, `timeline`, `flowchart` | 教程、过程推进、工具使用演示、轻叙事 |
| `notebook-sketch` | 笔记本草图概念风 | `conceptual`, `metaphor` | `framework`, `flowchart`, `scene` | 概念速写、控制论、系统隐喻、工作流结构 |
| `claymation` | 黏土定格玩具风 | `scene`, `metaphor` | `scene`, `comparison`, `timeline` | 降低技术门槛的解释类内容，属于特殊风格 |

## 默认建议

### 默认封面风格

- 默认风格：`follow article tone`
- 默认封面类型：`typography`
- 默认文字层级：`title-only`

### 默认正文图风格

- 默认正文图密度：`balanced`（3-5 张）
- 默认正文图类型：`auto`，由 agent 根据正文内容转换成明确的 `inline_type`

## 后续实现建议

1. 运行时先生成文章级风格选择结果
2. 封面 prompt 使用 `cover_type × style`
3. 正文图 outline 先判断 `inline_type`
4. 再按 `inline_type × style` 生成 prompt
5. 所有图共享同一主风格，不混风格
