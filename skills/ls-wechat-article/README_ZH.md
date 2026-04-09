# LS WeChat Article Skill

通用微信公众号工作流 skill。它可以起草文章、排版 Markdown、预览 HTML、生成封面和正文配图、发布到微信草稿箱，并在发布后回填数据、学习人工改稿习惯。

## 能力概览

| 你说 | Skill 会做什么 |
|------|----------------|
| `给 demo 写一篇公众号文章` | 走完整流程：选题 -> 写作 -> SEO -> 配图 -> 主题 -> 草稿箱 |
| `把这篇 Markdown 发到草稿箱` | 跳过写作，直接排版并发布 |
| `用 latepost-depth 主题预览` | 生成本地 HTML 预览 |
| `看看最近 7 天文章表现` | 读取微信 datacube 数据并回填 `history.yaml` |
| `根据我的修改学习风格` | 对比草稿与终稿，写入 lessons |
| `导入参考文章并刷新 playbook` | 读取 `corpus/` 并输出 playbook 分析输入 |

## 安装

环境要求：Node.js >= 18、Python >= 3.9、已认证微信公众号且具备 API 权限。

```bash
cd toolkit && npm install && npm run build && cd ..
pip install -r requirements.txt
mkdir -p .ls-wechat-article
cp config.example.yaml .ls-wechat-article/config.yaml
```

运行态数据目录按以下顺序解析：

1. `./.ls-wechat-article/`
2. `~/.liusir-skills/ls-wechat-article/`
3. 旧的 skill 目录文件只做只读兼容

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
- 启用后，Step 2 会通过 `scripts/fetch_trendradar_hotspots.py` 合并最近 1 天的新闻和最近 1 天的 RSS 订阅内容。
- 脚本输出仍然是给下游选题阶段使用的统一 JSON，而不是关键词列表。
- 如果 TrendRadar 不可用，流程会回退到 `scripts/fetch_hotspots.py`。

## 使用教程

### 1. 流程说明

| 步骤 | 说明 |
|------|------|
| Step 1 | 读取 client 配置并判断从哪一步开始 |
| Step 2 | 如果没有明确 topic，就先获取热点信号 |
| Step 3 | 选择文章选题 |
| Step 3.5 | 选择文章框架 |
| Step 4 | 生成文章草稿 |
| Step 5 | 做 SEO 和去 AI 味优化 |
| Step 6 | 决定图片范围、图片风格和正文图数量 |
| Step 7 | 决定主题，生成 HTML，预览或发布到草稿箱 |
| Step 8 | 更新 `history.yaml`，回填 stats，学习改稿，刷新 playbook |

### 2. 风格化说明

这套 skill 会分别处理两类风格：

- 图片风格：决定封面图和正文配图长什么样
- 排版主题：决定 HTML / 微信文章最后的阅读气质

#### 图片配置

| 要决定什么 | 可选项 | 说明 |
|------------|--------|------|
| 图片范围 | `cover + inline images` / `cover only` / `inline only` / `no images` | 决定是否生成封面、正文图、两者或都不生成 |
| 图片风格 | `follow article tone` / `editorial` / `blueprint` / `notion` / `warm` / `watercolor` / `scientific` / `lofi-doodle` / `multi-panel-manga` / `notebook-sketch` / `claymation` | 决定整篇文章图片的共同视觉方向 |
| 正文图数量 | `minimal` / `balanced` / `per-section` / `custom` | 这是 agent 的规划输入，用来决定要准备多少个显式正文图目标 |

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

#### 正文图数量说明

| 选项 | 说明 |
|------|------|
| `minimal` | 少量重点图，通常 `1-2 张` |
| `balanced` | 标准配图，通常 `3-5 张` |
| `per-section` | 尽量每个重点小节都配图 |
| `custom` | 自定义正文图数量 |

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
| `wechat-deepread` | 长阅读、密度较高文章 |
| `nikkei` | 技术/商业分析 |
| `lemonde` | 深度阅读、偏报道气质文章 |

如果没有指定主题，流程里会先询问你，或明确告诉你将使用哪个主题。

### 3. 使用方式

| 使用方式 | 什么时候用 | 你可以怎么说 |
|----------|------------|--------------|
| 从 topic 开始 | 你只有一个想写的主题，还没有文章草稿 | `帮我写一篇关于 AI 编程的公众号文章` |
| 从 Markdown 开始 | 你已经有现成 Markdown，只需要排版、预览或发布 | `把这篇 Markdown 排版成公众号样式并发布到草稿箱` |
| 从指定步骤开始 | 你不想走完整流程，只想从某一步接着做 | `从 --step 3.5 开始，我想先选框架` |
| 先做图片决策 | 你想单独先决定图片范围、风格、配图数量和显式图片目标 | `从 --step 6 开始，我想先决定图片配置` |
| 先做主题与发布 | 你已经有文章，只想确认主题、预览或发布 | `从 --step 7 开始，先告诉我会用什么主题` |
| 做复盘与学习 | 你想看文章表现、学习人工改稿，或刷新 playbook | `从 --step 8 开始，帮我更新 history、stats 和 lessons` |

## 常用命令

完整 CLI 语法见 [cli-reference.md](/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-wechat-article/references/cli-reference.md)。  
主题选择建议见 [theme-selection.md](/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-wechat-article/references/theme-selection.md)。

```bash
# 预览
node dist/cli.js preview article.md --theme wechat-tech

# 发布
node dist/cli.js publish article.md --theme latepost-depth

# 主题对比预览
node dist/cli.js theme-preview article.md

# 正文配图
node dist/cli.js illustrate article.md --client demo --style editorial --target "执行闭环::flowchart" --target "验证层::framework" --provider qwen

# 生成封面
node dist/cli.js cover article.md --client demo --style blueprint --type conceptual --provider openai

# 数据回填
node dist/fetch-stats.js --client demo --days 7

# 改稿学习
node dist/learn-edits.js --client demo --draft draft.md --final final.md

# playbook 分析
node dist/build-playbook.js --client demo
```

发布时如果不传 `--cover`，工具会尝试使用正文第一张图片作为草稿封面。  
`illustrate` 默认会把本次文章产物写入 `{runtime_root}/output/{client}/{date}-{title-slug}/`，其中包含 `article.md`、`assets/` 和 `prompts/`。toolkit 不再自己决定该配哪些小节、该用什么图片类型；这些都要由 agent 先选好，再显式传入 `--target`。

公共图片风格库位于 [references/image-system.yaml](/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-wechat-article/references/image-system.yaml)。运行态 client 数据位于 `{runtime_root}/clients/{client}/style.yaml`，只配置默认主题、写作画像和 client 覆盖项。

## 让文章越写越像这个号

这条链路分成三部分：

1. 喂语料  
   把历史代表文章、外部高相关案例文、结构参考稿放进 `{runtime_root}/clients/{client}/corpus/`，再运行 `build-playbook`。

2. 改稿学习  
   文章发布后，如果你人工改过草稿，再运行 `learn-edits`，把草稿和终稿差异写进 `lessons/`。

3. 手册刷新  
   当 `corpus/` 足够丰富，或 `lessons/` 每积累 5 条左右时，重新运行 `build-playbook`，刷新 `playbook.md`。

## 目录结构

```text
{runtime_root}/clients/demo/
├── style.yaml
├── history.yaml
├── playbook.md
├── corpus/
├── lessons/
└── themes/
```

这些目录和文件由 [style-template.md](/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-wechat-article/references/style-template.md) 说明。发布记录会写入 `{runtime_root}/clients/{client}/history.yaml`，改稿学习会写入 `{runtime_root}/clients/{client}/lessons/`，`corpus/` 作为参考语料目录供后续刷新 `playbook.md` 使用。

## 相关文件

- [agents/openai.yaml](/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-wechat-article/agents/openai.yaml)
- [scripts/validate_skill.py](/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-wechat-article/scripts/validate_skill.py)
- [toolkit/src/image-gen.ts](/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-wechat-article/toolkit/src/image-gen.ts)
- [toolkit/src/fetch-stats.ts](/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-wechat-article/toolkit/src/fetch-stats.ts)
- [toolkit/src/build-playbook.ts](/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-wechat-article/toolkit/src/build-playbook.ts)
- [toolkit/src/learn-edits.ts](/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-wechat-article/toolkit/src/learn-edits.ts)

## 许可证

MIT
