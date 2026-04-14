# LS Multi Collector Skill

这是一个本地采集工作流 skill。它可以下载受支持的视频、生成转录 bundle、抓取文章和社交内容到 Markdown 与 JSON，并保留来源元数据；对于不支持的来源会直接给出明确错误。

## Capabilities

| 你说 | Skill 会做什么 |
|------|----------------|
| `下载这个抖音视频` | 解析元数据、下载媒体文件，并写出本地视频 bundle |
| `把这个 YouTube 链接转录出来` | 优先使用官方字幕，不足时走远程 ASR |
| `把这篇微信文章抓成 Markdown` | 提取文章正文并写出 `article.md` + `metadata.json` |
| `抓一下这个 X thread` | 读取帖子或线程内容并写成本地文章 bundle |

## Installation

要求：Node.js >= 18、Python >= 3.9、`uv`、`ffmpeg`、`yt-dlp`，以及 [references/setup.md](./references/setup.md) 里列出的抓取工具。

```bash
cd toolkit && npm install && npm run build && cd ..
mkdir -p .ls-multi-collector
cp config.example.yaml .ls-multi-collector/config.yaml
```

运行期数据目录：

1. `./.ls-multi-collector/`
2. `./output/`

推荐校验：

```bash
python3 scripts/validate_skill.py
cd toolkit && npm run validate-skill
```

`config.yaml` 字段说明：

| 字段 | 是否必填 | 用途 |
|------|----------|------|
| `asr.provider` | 否 | 远程 ASR 提供方，启用时当前使用 `dashscope` |
| `asr.base_url` | 否 | 远程 ASR 提交地址覆盖值 |
| `asr.api_key` | 否 | 远程 ASR API Key |
| `asr.model` | 否 | 远程 ASR 模型名 |
| `llm.enabled` | 否 | 是否启用 LLM 清洗 / 翻译 |
| `llm.provider` | 否 | OpenAI-compatible 提供方名称 |
| `llm.base_url` | 否 | LLM Base URL |
| `llm.api_key` | 否 | LLM API Key |
| `llm.model` | 否 | LLM 模型名 |

## Optional: Remote ASR / LLM

远程 ASR 和 LLM 都是可选增强能力。

`.ls-multi-collector/config.yaml` 配置示例：

```yaml
asr:
  provider: "dashscope"
  base_url: "https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription"
  api_key: ""
  model: "qwen3-asr-flash-filetrans"

llm:
  enabled: false
  provider: "openai_compatible"
  base_url: "https://api.openai.com/v1"
  api_key: ""
  model: ""
```

说明：

- 抖音转录依赖远程 ASR，因为没有官方字幕路径。
- YouTube 转录优先走官方字幕，必要时再走远程 ASR。
- 如果不启用 LLM，转录流程仍会执行规则清洗。
- 如果不启用 LLM，不会生成 `translation.md`。

## Workflow Tutorial

### 1. Workflow

| 步骤 | 发生什么 |
|------|----------|
| Step 1 | 标准化原始输入并提取主链接 |
| Step 2 | 识别来源类型和平台 |
| Step 3 | 路由到 `download-video`、`transcript-video` 或 `fetch-article` |
| Step 4 | 执行平台对应的采集逻辑 |
| Step 5 | 执行规则清洗和可选的 LLM 增强 |
| Step 6 | 将结果写入本地 output bundle |

### 2. Source Guide

这个 skill 处理两类采集：

- 视频采集：`download-video` 和 `transcript-video`
- 文章采集：`fetch-article`

#### 支持来源

| 来源 | 默认动作 | 含义 |
|------|----------|------|
| `douyin` | `transcript-video` | 短视频转录或下载 |
| `youtube` | `transcript-video` | 优先字幕的转录或下载 |
| `mp.weixin.qq.com` | `fetch-article` | 微信公众号文章抓取 |
| `x.com / twitter.com` | `fetch-article` | 社交帖子 / 线程抓取 |
| 普通网页 | `fetch-article` | 用 `defuddle` 提取 Markdown |

#### 转录策略

| 来源 | 转录路径 | 说明 |
|------|----------|------|
| Douyin | remote ASR | 使用解析出的 `play_addr` 媒体地址 |
| YouTube | 官方字幕 -> remote ASR | 优先使用官方字幕 |

#### 输出 bundle

| 动作 | 必需文件 |
|------|----------|
| `download-video` | `video.*`、`metadata.json`、`report.md`、`manifest.json` |
| `transcript-video` | `metadata.json`、`raw.json`、`transcript.md`、`report.md`、`manifest.json` |
| `fetch-article` | `article.md`、`metadata.json` |

### 3. Usage Modes

| 使用模式 | 适用场景 | 示例 |
|----------|----------|------|
| 从视频链接开始 | 需要下载或转录 bundle | `把这个 YouTube 链接转录出来` |
| 从分享文案开始 | 原始分享文本里带主链接 | `转录这段抖音分享文案` |
| 从文章链接开始 | 需要本地 Markdown 结果 | `抓这篇微信文章` |
| 显式指定动作 | 已经知道目标动作 | `对这个抖音链接执行 download-video` |
| 先检查环境 | 想先看依赖和配置是否齐全 | `运行 doctor` |

## Common Commands

流程和输出规则：
- [pipeline.md](./references/pipeline.md)
- [output-contract.md](./references/output-contract.md)

```bash
# 环境检查
cd toolkit
npm run doctor

# 下载受支持的视频
npm run download-video -- "https://v.douyin.com/..."

# 转录受支持的视频
npm run transcript-video -- "https://www.youtube.com/watch?v=..."

# 抓取文章
npm run fetch-article -- "https://mp.weixin.qq.com/s/..."

# Skill 校验
npm run validate-skill
```

裸视频链接默认进入 `transcript-video`。  
`fetch-article` 只支持微信公众号、X 和普通网页。  

## Output Structure

```text
.ls-multi-collector/
├── config.yaml
├── logs/
└── temp/

output/
└── <timestamp>-<action>-<platform>-<slug>/
```

视频类 bundle 的 `metadata.json` 会保留来源信息，例如 `sourceUrl`、`platform`、`title`、`authorName`、`publishedAt`、`coverUrl`。

## Related Files

- [SKILL.md](./SKILL.md)
- [agents/openai.yaml](./agents/openai.yaml)
- [scripts/validate_skill.py](./scripts/validate_skill.py)
- [toolkit/src/cli.ts](./toolkit/src/cli.ts)
- [toolkit/src/downloadVideo.ts](./toolkit/src/downloadVideo.ts)
- [toolkit/src/transcriptVideo.ts](./toolkit/src/transcriptVideo.ts)
- [toolkit/src/fetchArticle.ts](./toolkit/src/fetchArticle.ts)

## License

当前 skill 仓库里还没有单独提供 license 文件。
