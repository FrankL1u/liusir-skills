---
name: ls-multi-collector
version: 1.0.0
description: |
  Collect videos and articles into local files with a repeatable workflow.
  Supports video download, video transcript, and article fetch across
  Douyin, YouTube, WeChat, X, and generic web pages.
  Use when the user wants to download a video, get a transcript,
  or fetch article content into Markdown and JSON artifacts.
triggers:
  - "下载视频"
  - "视频转录"
  - "抓取文章"
  - "提取字幕"
  - "抓公众号文章"
  - "抓微信文章"
  - "抓 X 内容"
  - "download video"
  - "transcript video"
  - "fetch article"
  - "wechat article"
metadata:
  openclaw:
    emoji: "🧲"
    requires:
      anyBins: ["node", "npm", "uv", "ffmpeg", "yt-dlp"]
---

# LS Multi Collector

Collect videos and articles into local files without a service layer. This skill keeps routing, execution rules, fallback rules, and quality bars in documentation. The agent decides which action to run. The toolkit executes the chosen action and writes artifacts to disk.

## Onboarding

**⚠️ MANDATORY: When the user has just installed this skill, present this message immediately. Do not ask whether they want an introduction. Translate it to the user's language.**

> **✅ LS Multi Collector installed!**
>
> Paste a video link, article link, or share text, and I will route it to the right collector workflow.
>
> **Try it now:**
> - `Download this Douyin video`
> - `Get a transcript from this YouTube link`
> - `Fetch this WeChat article into Markdown`
>
> **What it does:**
> - Downloads supported videos into a local bundle
> - Retrieves subtitles when available and falls back to ASR when needed
> - Fetches article and social-post content into Markdown + JSON artifacts
> - Writes results into the local `output/` directory
>
> **One-time setup:**
> 1. Install system components and scraping tools from `references/setup.md`
> 2. `cd toolkit && npm install && npm run build && cd ..`
> 3. `mkdir -p .ls-multi-collector && cp config.example.yaml .ls-multi-collector/config.yaml`
> 4. Fill in ASR / LLM config only if you want remote enhancement
>
> Without remote ASR or LLM, the skill can still download videos and fetch articles. Transcript runs require either official subtitles or configured remote ASR.

## Usage

This skill supports three core actions:

- Download a supported video into a local bundle
- Produce a transcript bundle for a supported video
- Fetch article or social content into Markdown and JSON

Examples:

- `Download this Douyin video`
- `Transcript this YouTube share text`
- `Fetch this WeChat article`
- `Grab this X thread into Markdown`

## Setup

Before first use, prepare the environment:

1. Install all required system components and scraping tools:
   - `node`
   - `npm`
   - `uv`
   - `ffmpeg`
   - `defuddle`
   - `xreach`
   - `camoufox runtime`
   - `yt-dlp`

2. Install toolkit dependencies and build:
   ```bash
   cd toolkit
   npm install
   npm run build
   cd ..
   ```

3. Create the runtime config:
   ```bash
   mkdir -p .ls-multi-collector
   cp config.example.yaml .ls-multi-collector/config.yaml
   ```

4. Fill in `.ls-multi-collector/config.yaml` for remote ASR and optional LLM.

The skill does not install missing system tools during collection runs. It only checks them and reports what is missing.

## Optional: ASR / LLM

Remote ASR and LLM are optional enhancements.

- If official subtitles are available, the transcript workflow uses them first.
- If no official subtitles are available and remote ASR is configured, the toolkit tries remote ASR.
- If no remote ASR is configured and no official subtitles exist, the toolkit stops with a precise config instruction.
- If no LLM is configured, the toolkit still performs rule-based transcript cleanup.
- If no LLM is configured, the toolkit does not produce translation output.

Remote service config belongs in `.ls-multi-collector/config.yaml`. Default paths and workflow behavior do not belong in config.

## Skill Directory

Read files on demand. Do not load everything upfront.

| Path | Purpose |
|------|---------|
| `references/setup.md` | First-run setup and install rules |
| `references/pipeline.md` | Full routing and execution flow |
| `references/routing-rules.md` | Input detection and action selection rules |
| `references/provider-matrix.md` | Supported platforms, dependencies, and limits |
| `references/output-contract.md` | Output bundle contract |
| `references/error-handling.md` | Failure and fallback rules |
| `references/skill-maintenance.md` | Validation and maintenance workflow |
| `prompts/transcriptCleanup.md` | LLM transcript cleanup prompt |
| `prompts/translateText.md` | LLM translation prompt |
| `toolkit/src/cli.ts` | Toolkit entrypoint |
| `toolkit/src/downloadVideo.ts` | Video download action |
| `toolkit/src/transcriptVideo.ts` | Video transcript action |
| `toolkit/src/fetchArticle.ts` | Article fetch action |
| `toolkit/src/doctor.ts` | Environment inspection |

## Execution Modes

### Auto

- Infer whether the user wants download, transcript, or article fetch from the request
- Extract the primary URL from share text when needed
- If the input is only a video link or video share text and the user did not name an action, default to `transcript-video`
- Do not route any video link to `fetch-article`
- Prefer direct completion over back-and-forth when the intended action is clear
- Continue through the whole action and return the finished output bundle
- Only stop when required input is missing or both the primary path and fallback path fail

### Action Override

If the user names the action explicitly, treat that as a routing override:

- `download-video` means write a video bundle
- `transcript-video` means write a transcript bundle
- `fetch-article` means write an article bundle

If the user explicitly asks for `fetch-article` on a video link, reject it and tell them to use `transcript-video` or `download-video`.

## Critical Quality Rules

1. Route based on actual user intent, not on the first URL alone.
2. If the user only provides a video link or video share text, default to `transcript-video`.
3. Do not route a video link to `fetch-article`.
4. Do not reintroduce query or task APIs such as `get`, `find`, `status`, `poll`, or `resume`.
5. Always write a local output bundle; do not return only inline text when the user asked for collection.
6. For video transcript and download flows, always preserve source metadata in `metadata.json`, including `sourceUrl`, `platform`, `title`, and other available source fields.
7. For transcript flow, use official subtitles first when available.
8. If official subtitles are absent, require configured remote ASR and stop with a precise config message if it is unavailable.
9. If no LLM is configured, keep rule-based cleanup and skip translation.
10. Do not install missing system tools during a collection run.
11. `doctor` must report `ffmpeg` and `yt-dlp` along with other required commands.
12. Keep prompts in `prompts/`, not inside `SKILL.md`.
13. Keep workflow rules in documentation, not in config feature flags.

## Pipeline Overview

The workflow is organized as follows:

1. Normalize input and extract the primary URL
2. Detect content type and supported platform
3. Route to `download-video`, `transcript-video`, or `fetch-article`
4. Execute the action with platform-specific logic
5. Apply rule-based cleanup and optional LLM enhancement where relevant
6. Write output artifacts under `output/`

Default routing inside step 3 is:

1. Explicit user action wins
2. Bare video link or video share text defaults to `transcript-video`
3. WeChat, X, and generic web links default to `fetch-article`
4. Video links do not enter `fetch-article`

For transcript flow, the fallback order is:

1. Official subtitles
2. Remote ASR if configured
3. Rule-based cleanup
4. Optional LLM cleanup and optional LLM translation

## Resilience: Never Stop on a Single-Step Failure

Do not stop the whole workflow because one enhancement path fails.

Follow these rules:

- If official subtitles fail, continue to ASR
- If remote ASR is not configured, stop with a config instruction
- If remote ASR fails, stop with the ASR failure
- If LLM cleanup fails, keep the rule-cleaned transcript
- If translation is unavailable, still return the transcript bundle
- If a scraping tool is missing, return a precise setup instruction instead of a vague failure
- Stop only when the requested action and all documented fallbacks fail

## Operations

Operational tasks for this skill include:

- First-run setup
- Environment inspection with `doctor`
- Runtime config preparation
- Bundle inspection under `output/`
- Updating docs, prompts, or toolkit code and re-running validation

Runtime data lives under:

- `.ls-multi-collector/config.yaml`
- `.ls-multi-collector/logs/`
- `.ls-multi-collector/temp/`
- `output/`

## Gotchas — Common Failure Patterns

Common failure patterns include:

- Missing `ffmpeg` causing merged video or audio extraction failures
- Missing `defuddle` or `xreach` causing article or X fetch failures
- Expecting the skill to install system tools during a run
- Assuming transcript can run without official subtitles or configured ASR
- Treating generic web pages and WeChat pages as equivalent fetch paths
- Forgetting that bare video links default to transcript instead of article fetch
- Expecting `fetch-article` to accept YouTube or Douyin links
- Editing prompts or docs without re-running validation

When these happen, check setup, routing, and doctor output first.

## Comparison

Compared with a generic “download this” or “summarize this page” prompt, this skill:

- Routes the request to a concrete collector workflow
- Produces repeatable local artifact bundles
- Applies transcript-specific cleanup and fallback rules
- Keeps installation rules, routing logic, and output contracts explicit

Use it when the goal is not just to answer a one-off question, but to collect source material into stable files.

## References

- Setup: `references/setup.md`
- Pipeline: `references/pipeline.md`
- Routing rules: `references/routing-rules.md`
- Provider matrix: `references/provider-matrix.md`
- Output contract: `references/output-contract.md`
- Error handling: `references/error-handling.md`
- Maintenance: `references/skill-maintenance.md`
