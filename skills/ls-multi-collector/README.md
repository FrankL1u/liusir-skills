# LS Multi Collector Skill

Universal local collector workflow skill. It can download supported videos, create transcript bundles, fetch articles and social posts into Markdown and JSON, preserve source metadata, and stop unsupported sources with precise errors.

## Capabilities

| You say | The skill does |
|---------|----------------|
| `Download this Douyin video` | Resolves metadata, downloads media, and writes a local video bundle |
| `Get a transcript from this YouTube link` | Prefers official subtitles, then falls back to configured remote ASR |
| `Fetch this WeChat article into Markdown` | Extracts article content and writes `article.md` + `metadata.json` |
| `Grab this X thread` | Reads the post or thread and writes a local article bundle |

## Installation

Requirements: Node.js >= 18, Python >= 3.9, `uv`, `ffmpeg`, `yt-dlp`, and the scraping tools listed in [references/setup.md](./references/setup.md).

```bash
cd toolkit && npm install && npm run build && cd ..
mkdir -p .ls-multi-collector
cp config.example.yaml .ls-multi-collector/config.yaml
```

Runtime data lives under:

1. `./.ls-multi-collector/`
2. `./output/`

Recommended validation:

```bash
python3 scripts/validate_skill.py
cd toolkit && npm run validate-skill
```

`config.yaml` fields:

| Field | Required | Purpose |
|------|----------|---------|
| `asr.provider` | No | Remote ASR provider, currently `dashscope` when enabled |
| `asr.base_url` | No | Remote ASR submit URL override |
| `asr.api_key` | No | Remote ASR API key |
| `asr.model` | No | Remote ASR model override |
| `llm.enabled` | No | Whether LLM cleanup / translation is enabled |
| `llm.provider` | No | OpenAI-compatible provider name |
| `llm.base_url` | No | LLM base URL |
| `llm.api_key` | No | LLM API key |
| `llm.model` | No | LLM model name |

## Optional: Remote ASR / LLM

Remote ASR and LLM are optional enhancements.

Configuration in `.ls-multi-collector/config.yaml`:

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

Notes:

- Douyin transcript relies on configured remote ASR because there is no official subtitle path.
- YouTube transcript prefers official subtitles and falls back to remote ASR when needed.
- If LLM is disabled, transcript flow still applies rule-based cleanup.
- If LLM is disabled, `translation.md` is not produced.

## Workflow Tutorial

### 1. Workflow

| Step | What happens |
|------|--------------|
| Step 1 | Normalize raw input and extract the primary URL |
| Step 2 | Detect source type and platform |
| Step 3 | Route to `download-video`, `transcript-video`, or `fetch-article` |
| Step 4 | Execute platform-specific collection logic |
| Step 5 | Apply rule-based cleanup and optional LLM enhancement |
| Step 6 | Write artifacts into a local output bundle |

### 2. Source Guide

This skill handles two kinds of collection:

- video collection: `download-video` and `transcript-video`
- article collection: `fetch-article`

#### Supported sources

| Source | Default action | Meaning |
|--------|----------------|---------|
| `douyin` | `transcript-video` | Short-video transcript or download |
| `youtube` | `transcript-video` | Subtitle-first transcript or download |
| `mp.weixin.qq.com` | `fetch-article` | WeChat Official Account article extraction |
| `x.com / twitter.com` | `fetch-article` | Social post / thread extraction |
| Generic web | `fetch-article` | Clean Markdown extraction with `defuddle` |

#### Transcript strategy

| Source | Transcript path | Notes |
|--------|------------------|-------|
| Douyin | remote ASR | Uses parsed `play_addr` media URL |
| YouTube | official subtitle -> remote ASR | Official subtitles are preferred |

#### Output bundles

| Action | Required files |
|--------|----------------|
| `download-video` | `video.*`, `metadata.json`, `report.md`, `manifest.json` |
| `transcript-video` | `metadata.json`, `raw.json`, `transcript.md`, `report.md`, `manifest.json` |
| `fetch-article` | `article.md`, `metadata.json` |

### 3. Usage Modes

| Usage mode | When to use it | Example |
|------------|----------------|---------|
| Start from a video link | You want a download or transcript bundle | `Transcript this YouTube link` |
| Start from share text | The original share text contains the main URL | `Transcript this Douyin share text` |
| Start from an article link | You want local Markdown output | `Fetch this WeChat article` |
| Start with an explicit action | You already know the target action | `Run download-video for this Douyin link` |
| Check environment first | You want to inspect dependencies and config | `Run doctor` |

## Common Commands

Pipeline and output rules:
- [pipeline.md](./references/pipeline.md)
- [output-contract.md](./references/output-contract.md)

```bash
# Environment check
cd toolkit
npm run doctor

# Download a supported video
npm run download-video -- "https://v.douyin.com/..."

# Transcript a supported video
npm run transcript-video -- "https://www.youtube.com/watch?v=..."

# Fetch an article
npm run fetch-article -- "https://mp.weixin.qq.com/s/..."

# Skill validation
npm run validate-skill
```

Bare video links default to `transcript-video`.  
`fetch-article` only supports WeChat, X, and generic web pages.  

## Output Structure

```text
.ls-multi-collector/
├── config.yaml
├── logs/
└── temp/

output/
└── <timestamp>-<action>-<platform>-<slug>/
```

Video bundles preserve source metadata in `metadata.json`, including `sourceUrl`, `platform`, `title`, `authorName`, `publishedAt`, and `coverUrl` when available.

## Related Files

- [SKILL.md](./SKILL.md)
- [agents/openai.yaml](./agents/openai.yaml)
- [scripts/validate_skill.py](./scripts/validate_skill.py)
- [toolkit/src/cli.ts](./toolkit/src/cli.ts)
- [toolkit/src/downloadVideo.ts](./toolkit/src/downloadVideo.ts)
- [toolkit/src/transcriptVideo.ts](./toolkit/src/transcriptVideo.ts)
- [toolkit/src/fetchArticle.ts](./toolkit/src/fetchArticle.ts)

## License

No standalone license file is currently bundled with this skill.
