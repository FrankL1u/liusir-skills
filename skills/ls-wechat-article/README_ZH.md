# LS WeChat Article Skill

通用微信公众号工作流 skill。它可以起草文章、排版 Markdown、预览 HTML、生成封面和正文配图、发布到微信草稿箱，并在发布后回填数据、学习人工改稿习惯。

## 能力概览

| 你说 | Skill 会做什么 |
|------|----------------|
| `给 demo 写一篇公众号文章` | 走完整流程：选题 -> 框架与原型 -> 标题与写作 -> 质检 -> 封面/正文图 -> 主题 -> 草稿箱 |
| `把这篇 Markdown 发到草稿箱` | 跳过写作。若你没明确说不要改内容，仍会先做质检诊断再发布 |
| `用 latepost-depth 主题预览` | 生成本地 HTML 预览 |
| `看看最近 7 天文章表现` | 读取微信数据并整理近期表现 |
| `根据我的修改学习风格` | 对比草稿与终稿，提炼后续写作偏好 |
| `导入参考文章并刷新写作偏好` | 分析参考文章，更新账号写作习惯 |

## 安装

环境要求：Node.js >= 18、Python >= 3.9、已认证微信公众号且具备 API 权限。

```bash
cd toolkit && npm install && npm run build && cd ..
pip install -r requirements.txt
mkdir -p .ls-wechat-article
cp config.example.yaml .ls-wechat-article/config.yaml
```

建议执行一次校验：

```bash
python3 scripts/validate_skill.py
npm run validate-skill
```

`config.yaml` 需要填写：

| 字段 | 必填 | 说明 |
|------|------|------|
| `wechat.appid` | 是 | 微信公众号 AppID |
| `wechat.secret` | 是 | 微信公众号 AppSecret |
| `wechat.author` | 否 | 默认作者名 |
| `image.providers.gemini.api_key` | 否 | Gemini Imagen |
| `image.providers.openai.api_key` | 否 | OpenAI `gpt-image-1` |
| `image.providers.doubao.api_key` | 否 | 豆包 Seedream |
| `image.providers.qwen.api_key` | 否 | 阿里云百炼 `qwen-image-2.0-pro` |

## WeChat 配置

微信开发者平台：[developers.weixin.qq.com](https://developers.weixin.qq.com/platform?tab1=basicInfo&tab2=dev)

1. 打开公众号管理页
2. 复制 `AppID`
3. 重置并保存 `AppSecret`
4. 将当前公网 IP 加入 API IP 白名单

示例：

```bash
curl -s https://ifconfig.me
```

## 可选：TrendRadar

TrendRadar 是 Step 2 选题阶段可选的热点信号来源。
如果本地已经安装并能访问对应 MCP 服务，流程可以先用它抓取热点，再进入选题判断。

项目地址：
- [TrendRadar](https://github.com/sansan0/TrendRadar)

在 `.ls-wechat-article/config.yaml` 或 `~/.liusir-skills/ls-wechat-article/config.yaml` 中配置：

```yaml
trendradar:
  enabled: true
  base_url: "http://127.0.0.1:3333/mcp"
  timeout_ms: 30000
```

说明：
- TrendRadar 不是写作、排版、预览、发布的必需依赖。
- 启用后，Step 2 会合并最近 1 天的新闻和 RSS 订阅内容。
- 如果 TrendRadar 不可用，流程会回退到通用热点抓取。
- 在正式起草新文章前，流程会先搜索一轮最新相关资讯。这个要求只作用于写作流程，不作用于纯排版或纯发布流程。

## 使用教程

### 1. 流程说明

| 步骤 | 说明 |
|------|------|
| Step 1 | 读取 client 配置并判断从哪一步开始 |
| Step 2 | 如果没有明确 topic，就先获取热点信号 |
| Step 3 | 选择文章选题 |
| Step 3.5 | 选择框架、文章原型和输出 shape |
| Step 4 | 先搜索最新相关资讯，再生成标题候选、评分选定 H1，然后按原型约束生成文章草稿 |
| Step 4.5 | 执行质检，反馈修复建议 |
| Step 5 | 按账号视觉偏好生成封面图 |
| Step 5.5 | 规划明确的正文图目标，然后生成正文配图 |
| Step 6 | 决定主题，生成 HTML，预览或发布到草稿箱 |
| Step 7 | 复盘文章表现、学习改稿习惯、更新账号写作偏好 |

### 2. 风格化说明

这套 skill 会分别处理两类风格：

- 图片风格：决定封面图和正文配图长什么样
- 排版主题：决定 HTML / 微信文章最后的阅读气质

#### 图片配置

首次生成图片时，流程会询问图片范围、整体风格、配色、封面方向和正文图密度。用户可以跳过任意项，跳过时使用默认值。后续默认沿用账号偏好，除非本次明确变更。

| 要决定什么 | 可选项 | 默认值 | 说明 |
|------------|--------|--------|------|
| 图片范围 | 封面+正文图 / 只生成封面 / 只生成正文图 / 不生成图片 | 封面+正文图 | 决定本次是否需要图片 |
| 整体图片风格 | 跟随文章基调、杂志信息图、技术蓝图、极简手绘、温暖亲和、水彩柔和、学术图表、多格漫画、笔记本草图、黏土定格等 | 跟随文章基调 | 决定封面和正文图的统一视觉方向 |
| 配色方案 | 跟随风格、马卡龙、黑白墨线、霓虹、暖调 | 跟随风格 | 控制图片的整体色彩气质 |
| 封面方向 | 焦点视觉、概念解释、标题主导、隐喻表达、场景氛围、极简留白 | 标题主导 | 决定封面第一眼的表达方式 |
| 封面强度 | 克制、均衡、强烈 | 均衡 | 决定视觉冲击力 |
| 封面文字 | 无文字、仅标题、标题+副标题、信息丰富 | 仅标题 | 决定封面上放多少文字 |
| 正文图密度 | 少量重点图、标准配图、按章节配图、全文覆盖、不生成正文图 | 标准配图 | 默认通常生成 3-5 张正文图 |
| 正文图类型 | 自动选型、数据图、场景图、流程图、对比图、框架图、时间线 | 自动选型 | 自动选型时，流程会根据每个段落目标选择最合适的图型 |

#### 图片风格说明

| 风格 key | 中文名称 | 更适合什么内容 |
|----------|----------|----------------|
| `follow article tone` | 跟随文章基调 | 不想手动选风格时，由 agent 按文章基调决定 |
| `editorial` | 杂志信息图风 | 方法论、趋势判断、工具分析 |
| `blueprint` | 技术蓝图风 | 架构、系统设计、流程说明 |
| `notion` | 极简手绘线条风 | 知识分享、生产力、SaaS 内容 |
| `warm` | 温暖亲和风 | 故事、个人成长、生活方式 |
| `watercolor` | 水彩柔和风 | 创意表达、轻叙事 |
| `scientific` | 学术精确图表风 | 技术、生物、科研、严谨分析 |
| `lofi-doodle` | 低保真手绘涂鸦风 | 思路草图、轻量概念说明 |
| `multi-panel-manga` | 多格漫画说明风 | 步骤演示、过程说明、叙事场景 |
| `notebook-sketch` | 笔记本草图概念风 | 系统草图、抽象概念图 |
| `claymation` | 黏土定格玩具风 | 亲和型表达、轻教育内容 |

#### 配色方案

| palette key | 中文名称 | 说明 |
|-------------|----------|------|
| `default` | 跟随风格配色 | 使用所选视觉风格的默认配色 |
| `macaron` | 马卡龙 | 柔和色块，适合轻教育和亲和型内容 |
| `mono-ink` | 黑白墨线 | 黑白线稿，适合草图、漫画、结构说明 |
| `neon` | 霓虹 | 深色高饱和，适合 AI、工具、未来感主题 |
| `warm` | 暖调 | 适合叙事、观点、个人经验文章 |

#### 封面类型说明

| type key | 中文名称 | 说明 |
|----------|----------|------|
| `hero` | 焦点视觉 | 一个强主体，第一眼冲击更强 |
| `conceptual` | 概念解释 | 用抽象结构解释核心概念 |
| `typography` | 标题主导 | 以标题版式为主，默认选项 |
| `metaphor` | 隐喻表达 | 用具体物体或结构表达文章论点 |
| `scene` | 场景氛围 | 用工作、生活或叙事场景定调 |
| `minimal` | 极简留白 | 单焦点、少元素、大留白 |

#### 正文图数量说明

| 选项 | 说明 |
|------|------|
| `minimal` | 少量重点图，通常 `1-2 张` |
| `balanced` | 标准配图，通常 `3-5 张` |
| `per-section` | 尽量每个重点小节都配图 |
| `rich` | 长文中覆盖更多高价值配图位置 |
| `none` | 不生成正文图 |

#### 正文图类型说明

| type key | 中文名称 | 说明 |
|----------|----------|------|
| `auto` | 自动选型 | agent 根据每个插图目标显式选择下列类型之一 |
| `infographic` | 数据图 | 模块化信息图、数字、层级信息 |
| `scene` | 场景图 | 把段落翻译成一个可读场景 |
| `flowchart` | 流程图 | 步骤、箭头、顺序和转折 |
| `comparison` | 对比图 | before/after、方案对比、取舍关系 |
| `framework` | 框架图 | 模块、层级、系统关系 |
| `timeline` | 时间线 | 阶段、里程碑、演进过程 |

#### 文章排版主题

| 主题 key | 适用场景 |
|----------|----------|
| `wechat-tech` | 技术拆解、工具分析、工作流文章 |
| `wechat-anthropic` | 温和长文、个人表达、创作者随笔 |
| `wechat-default` | 通用稳妥默认主题 |
| `wechat-medium` | 简洁现代、通用文章 |
| `latepost-depth` | 观点拆解、趋势分析、强结构长文 |
| `guardian` | 媒体感强、评论型文章 |
| `wechat-ft` | 深度报道、商业长文 |
| `wechat-nyt` | 深度报道、长篇特写 |
| `wechat-deepread` | 长阅读、密度较高文章 |
| `nikkei` | 技术/商业分析 |
| `lemonde` | 深度阅读、偏报道气质文章 |
| `wechat-elegant` | 个人表达、温和长文、创作者随笔 |
| `kenya-emptiness` | 强留白、实验气质内容 |
| `hische-editorial` | 插画感强、视觉识别度高的编辑风 |
| `ando-concrete` | 冷静、建筑感、强秩序内容 |
| `gaudi-organic` | 有机曲线、艺术感、创意表达 |
| `wechat-jonyive` | 极简产品感、设计/产品文章 |
| `wechat-apple` | Apple 风产品表达、发布会/产品分析 |

如果没有指定主题，流程里会先询问你，或明确告诉你将使用哪个主题。

#### 标题生成规则

Step 4 写正文前会先生成并评分标题候选，再选定一个作为文章标题。

标题不是摘要，而是点击理由。候选标题至少要命中一种动机：

- 观点鲜明
- 好奇疑问
- 认知反差
- 悬念缺口
- 痛点利益

Step 4.5 会继续检查标题长度、核心关键词位置、标题承诺是否被正文兑现，以及摘要是否重复标题。

### 3. 使用方式

| 使用方式 | 什么时候用 | 你可以怎么说 |
|----------|------------|--------------|
| 从 topic 开始 | 你只有一个想写的主题，还没有文章草稿 | `帮我写一篇关于 AI 编程的公众号文章` |
| 从 Markdown 开始 | 你已经有现成 Markdown，只需要排版、预览或发布。默认仍会做质检诊断，除非你明确说 `仅发布` 或 `不要改内容` | `把这篇 Markdown 排版成公众号样式并发布到草稿箱` |
| 从指定步骤开始 | 你不想走完整流程，只想从某一步接着做 | `从 --step 3.5 开始，我想先选框架` |
| 先做封面 | 你想先看封面配置或封面计划 | `从 --step 5 开始，先看封面计划` |
| 先做正文图 | 你想先看正文图目标位置 | `从 --step 5.5 开始，先看正文图目标` |
| 先做主题与发布 | 你已经有文章，只想确认主题、预览或发布 | `从 --step 6 开始，先告诉我会用什么主题` |
| 做复盘与学习 | 你想看文章表现、学习人工改稿，或更新账号写作偏好 | `从 --step 7 开始，帮我复盘文章表现并学习改稿习惯` |

## 常用命令

完整 CLI 语法见 [cli-reference.md](./references/cli-reference.md)。  
主题选择建议见 [theme-selection.md](./references/theme-selection.md)。

```bash
# 预览
node dist/cli.js preview article.md --theme wechat-tech

# 发布
node dist/cli.js publish article.md --theme latepost-depth

# 文章质检
node dist/cli.js editorial-qa article.md --client demo

# 主题对比预览
node dist/cli.js theme-preview article.md

# 正文配图
node dist/cli.js illustrate article.md --client demo --style editorial --palette default --target "先定义输入，再定义输出，最后定义回看路径::flowchart" --target "不要把验证留到最后，应该让验证跟执行一起发生::framework" --provider qwen

# 生成封面
node dist/cli.js cover article.md --client demo --style blueprint --palette default --type typography --text-level title-only --provider openai

# 数据回填
node dist/fetch-stats.js --client demo --days 7

# 改稿学习
node dist/learn-edits.js --client demo --draft draft.md --final final.md

# playbook 分析
node dist/build-playbook.js --client demo
```

预览 HTML 会自动把文章同目录下的 `cover.png` / `cover.jpg` / `cover.jpeg` / `cover.webp` 放在正文最顶部；发布到微信草稿箱时不会把这张封面图插进正文。
发布时如果要使用 Step 5 生成的封面，建议显式传 `--cover cover.png`。如果不传 `--cover`，工具会尝试使用正文第一张图片作为草稿封面。
`editorial-qa` 会输出质检判断和修复建议，让 Step 4.5 的结果可复查。
`illustrate` 需要先由流程明确正文图位置和图片类型，再生成图片并插入文章。

## 让文章越写越像这个号

这条链路分成三部分：

1. 喂参考文章
   提供历史代表文章、外部高相关案例文、结构参考稿。

2. 改稿学习  
   文章发布后，如果你人工改过草稿，流程可以对比修改前后差异，总结你的偏好。

3. 更新写作偏好
   当参考文章和人工改稿积累到一定数量后，流程会更新后续写作时使用的账号偏好。

## 许可证

MIT
