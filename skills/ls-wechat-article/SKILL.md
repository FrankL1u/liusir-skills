---
name: ls-wechat-article
version: 1.0.0
description: |
  Write, format, preview, and publish WeChat Official Account articles with AI.
  Supports topic-driven drafting, Markdown-to-WeChat conversion, theme styling,
  optional image generation with Gemini/OpenAI/Doubao, analytics backfill,
  and edit-learning workflows.
  Use when the user wants to "写公众号文章", "微信排版", "发布到草稿箱",
  "preview WeChat article", or "复盘公众号数据".
triggers:
  - "公众号"
  - "微信公众号"
  - "微信文章"
  - "推文"
  - "草稿箱"
  - "微信排版"
  - "公众号排版"
  - "公众号写作"
  - "封面图"
  - "配图"
  - "文章复盘"
  - "写公众号"
  - "WeChat article"
  - "wechat article"
  - "write WeChat"
  - "WeChat format"
  - "WeChat publish"
  - "publish to WeChat"
  - "WeChat drafts"
metadata:
  openclaw:
    emoji: "✍️"
    homepage: https://github.com/FrankL1u/liusir-skills
    requires:
      anyBins: ["node", "npm", "python3"]
---

# LS WeChat Article Writer

Write and publish WeChat Official Account articles without manual formatting. This skill keeps workflow rules in documentation and repeatable execution in code. Use `SKILL.md` for trigger rules, execution modes, routing overview, resilience rules, and non-negotiable quality bars. Use `references/` files for detailed execution guidance.

Workflow judgment stays in the docs and the agent. Toolkit commands should execute explicit decisions, not infer article strategy from content.

## Onboarding

**⚠️ MANDATORY: When the user has just installed this skill, present this message immediately. Do not ask whether they want an introduction. Translate it to the user's language.**

> **✅ AI WeChat Article Writer installed!**
>
> Tell me your topic, or paste a Markdown draft, and I will turn it into a WeChat article.
>
> **Try it now:**
> - `Help me write a WeChat article about AI coding`
> - `Format this Markdown for WeChat and publish it to drafts`
> - `Preview this WeChat article with the latepost-depth theme`
>
> **What it does:**
> - Plans article angles from a topic or trending signals（Supports TrendRadar MCP）
> - Writes professional articles with a de-AI voice
> - Formats content with WeChat-optimized themes
> - Generates optional cover and inline images
> - Publishes directly to the WeChat draft box
>
> **One-time setup:**
> 1. `cd toolkit && npm install && npm run build && cd ..`
> 2. `pip install -r requirements.txt`
> 3. `mkdir -p .ls-wechat-article && cp config.example.yaml .ls-wechat-article/config.yaml`
> 4. Fill in `wechat.appid` and `wechat.secret`, then add your public IP to the WeChat API whitelist
>
> No WeChat API yet? You can still write and preview locally.

## Usage

This skill supports four common entry patterns:

- Start from a concrete topic and draft a full article
- Start from existing Markdown and handle formatting, preview, or publishing only
- Start from a specific workflow step with `--step`
- Run post-publish maintenance such as analytics backfill, edit learning, or playbook refresh

Examples:

- `Write a WeChat article about AI coding trends`
- `Format this Markdown for WeChat and publish it to drafts`
- `Start from --step 3.5 and help me choose a framework`
- `Show me the last 7 days of article performance`

## Setup

Before first use, prepare the environment:

1. Install Node dependencies and build the toolkit:
   ```bash
   cd toolkit && npm install && npm run build && cd ..
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Create the runtime config:
   ```bash
   mkdir -p .ls-wechat-article
   cp config.example.yaml .ls-wechat-article/config.yaml
   ```

4. Fill in these fields in `.ls-wechat-article/config.yaml` or `~/.liusir-skills/ls-wechat-article/config.yaml`:
   - `wechat.appid`
   - `wechat.secret`

5. Add the current public IP to the WeChat API whitelist:
   ```bash
   curl -s https://ifconfig.me
   ```

Without WeChat API credentials, the skill can still draft, format, and preview locally, but it cannot publish to the draft box.

### Optional: TrendRadar

If TrendRadar is installed, the skill can use a configured TrendRadar MCP client to fetch topic signals.
If it is not configured, the skill should fall back to general hotspot scripts or direct user-provided topics.

TrendRadar is optional and is not required for drafting, formatting, preview, or publishing.

## Skill Directory

Read files on demand. Do not load everything upfront.

| Path | Purpose |
|------|---------|
| `references/pipeline.md` | End-to-end execution detail |
| `references/operations.md` | First-run setup, client onboarding, publishing support, analytics, and learning workflows |
| `references/writing-guide.md` | Writing quality bar and de-AI rules |
| `references/article-archetypes.md` | Archetype routing and shape binding |
| `references/editorial-qa.md` | Step 4.5 report template, repair-plan output, and blocking rules |
| `references/rewrite-examples.md` | Few-shot rewrite patterns for optional user-requested revision |
| `references/frameworks.md` | Article framework selection |
| `references/topic-selection.md` | Topic scoring and angle selection |
| `references/seo-rules.md` | Title, digest, tags, and SEO polish |
| `references/visual-prompts.md` | Cover and inline image prompt guidance |
| `references/visual-prompt-system.md` | Machine-readable visual prompt system and defaults |
| `references/theme-selection.md` | Public theme recommendation matrix |
| `references/style-template.md` | Client style template |
| `references/wechat-constraints.md` | WeChat rendering constraints |
| `references/cli-reference.md` | CLI command reference |
| `references/skill-maintenance.md` | Skill maintenance and validation rules |
| `{runtime_root}/clients/{client}/style.yaml` | Client voice, default theme, and `visuals` defaults |
| `{runtime_root}/clients/{client}/history.yaml` | Publish history and analytics |
| `{runtime_root}/clients/{client}/playbook.md` | Client-specific writing playbook |
| `toolkit/dist/*.js` | Built CLI entrypoints |
| `scripts/*.py` | Topic and SEO helper scripts |

## Execution Modes

### Auto

- Move the workflow forward without pausing by default
- Stop only when required input is missing, a step and its fallback both fail, or the workflow reaches an explicit user-decision boundary
- If the user explicitly says `仅排版` / `仅发布` / `不要改内容`, skip directly to Step 6
- If the user provides raw Markdown without that restriction, skip drafting but still run Step 4.5 before Step 6
- If the user provides a concrete topic, skip hotspot mining and topic generation
- Before image generation, if `style.yaml` has no `visuals`, ask for the complete first-run visual configuration. Use defaults only for skipped or unset fields, then initialize `style.yaml.visuals`
- Before preview or publish, ask for a theme or clearly state the auto-selected theme

### Step Override

Treat `--step N` as an explicit routing and pause directive.

- `--step 3` means generate topic candidates and stop
- `--step 3.5` means generate framework proposals and stop
- `--step 5` means generate or review the cover plan and stop
- `--step 5.5` means plan inline image targets and stop
- `--step 6` means start from formatting and publishing
- `--step 7` means start from post-publish maintenance tasks

## Critical Quality Rules

1. Read `references/writing-guide.md` and `references/seo-rules.md` before drafting.
2. Before Step 4 drafting, gather fresh related information for the article subject. Do not draft “latest / trend / current state” articles from memory only.
3. In Step 3.5, choose both `framework` and `article_archetype`, then bind `output_shape`.
4. In Step 4, generate and score title candidates from `references/seo-rules.md`, then select one H1 before drafting the body.
5. The digest must not repeat the title.
6. Respect the blacklist and tone fields in `{runtime_root}/clients/{client}/style.yaml`.
7. Route from Step 1 based on the actual input type instead of forcing the full pipeline every time.
8. Respect explicit `--step` routing and stop at that step.
9. Step 4.5 is Editorial QA and must run after drafting.
10. Step 4.5 must write `quality-report.md` beside the article bundle and report a concise repair plan to the user. Do not revise the article unless the user explicitly asks for revision.
11. Before generating visuals, if `style.yaml` has no `visuals`, ask for all first-run visual fields, then initialize `style.yaml.visuals`; if a field is skipped or unset, use its default from `references/visual-prompt-system.md`; if `visuals` exists, follow it without asking.
12. In Step 5, generate cover images. Default cover type is `typography`; default text level is `title-only`.
13. In Step 5.5, generate inline images. Default inline density is `balanced`; default inline type is `auto`, but the agent must convert it into explicit `--target "{anchor}::{inline_type}"` entries before calling the toolkit.
14. If the user changes visual settings for the current run, ask whether to write the changed `visuals` back for future runs.
15. Before preview or publish, ask for a theme or explicitly state the chosen theme.
16. When the workflow reaches publishing, publish directly to WeChat drafts. Do not ask for an extra publish confirmation.
17. If publishing fails, fall back to local preview instead of stopping the workflow.
18. Use configured image providers only: Gemini, OpenAI, Doubao, or Qwen.

## Pipeline Overview

The workflow is organized by these step labels:

1. Step 1: Load client configuration and identify the input type
2. Step 2: Fetch topical signals when no concrete topic is provided
3. Step 3: Pick a topic angle
4. Step 3.5: Pick an article framework and article archetype
5. Step 4: Draft the article with archetype-bound writing rules
6. Step 4.5: Run Editorial QA and report repair suggestions
7. Step 5: Generate the cover image
8. Step 5.5: Plan and generate inline images
9. Step 6: Format, preview, and publish to WeChat drafts
10. Step 7: Update history, analytics, and lessons

The later stages also cover corpus ingestion and playbook refresh when the user asks to feed source material or update the client's writing system.

## Resilience: Never Stop on a Single-Step Failure

Do not stop the entire workflow because one step fails.

Follow these rules:

- If a step fails, try its documented fallback first
- If publishing fails, fall back to local preview
- If image generation fails, continue with a text-only or prompt-only version
- If hotspot fetching fails, ask the user for a direct topic and continue
- If fresh-info search fails during drafting, tell the user what is missing and either continue with explicit freshness limits or ask for source links
- Stop only when required input is missing or both the primary path and fallback fail

The goal is to deliver the best usable outcome, not to terminate the whole workflow on a local failure.

## Operations

Operational tasks for this skill include:

- First-run setup
- Client onboarding
- Corpus ingestion and playbook refresh
- Analytics backfill
- Edit learning and summarization

See `references/operations.md` for detailed procedures.

If `{runtime_root}/clients/{client}/` does not exist, do not silently invent a full client profile. Follow the onboarding guidance and template references defined in the operational docs.

## Gotchas — Common Failure Patterns

Common failure patterns include:

- WeChat publishing fails because the current public IP is not whitelisted
- Local preview looks correct but WeChat rendering still breaks due to unsupported CSS
- Edit learning is run on mismatched draft and final files
- `corpus/` is treated as an automatic archive instead of a curated reference set
- Toolkit source changes are made without rebuilding `dist/`
- Topic selection relies on script output without real client-fit judgment

When these happen, check configuration, file paths, client state, and build artifacts first.

## Comparison

Compared with a generic "write me a WeChat article" prompt, this skill:

- Covers the full path from topic to WeChat drafts
- Handles formatting, SEO polish, visuals, and publication together
- Supports client-level history, style memory, and playbook maintenance
- Enables a repeatable workflow instead of a one-off text generation task

Use it when the goal is not just to generate an article, but to operate a repeatable WeChat publishing workflow.

## References

- Execution detail: `references/pipeline.md`
- Operations and onboarding: `references/operations.md`
- Writing quality: `references/writing-guide.md`
- Archetype routing: `references/article-archetypes.md`
- Editorial QA: `references/editorial-qa.md`
- Rewrite examples: `references/rewrite-examples.md`
- Framework selection: `references/frameworks.md`
- Topic selection: `references/topic-selection.md`
- SEO rules: `references/seo-rules.md`
- Visual prompts: `references/visual-prompts.md`
- Theme selection: `references/theme-selection.md`
- WeChat constraints: `references/wechat-constraints.md`
- CLI reference: `references/cli-reference.md`
