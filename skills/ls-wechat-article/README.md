# LS WeChat Article Skill

Universal WeChat Official Account workflow skill. It can draft articles, format Markdown, preview HTML, generate cover and inline images, publish to WeChat drafts, backfill stats, and learn from human edits.

## Capabilities

| You say | The skill does |
|---------|----------------|
| `Write a WeChat article for demo` | Runs the full workflow: topic -> draft -> SEO -> images -> theme -> draft publish |
| `Publish this Markdown to WeChat drafts` | Skips drafting and formats + publishes only |
| `Preview this article with latepost-depth` | Generates a local HTML preview |
| `Show the last 7 days of article performance` | Fetches WeChat datacube stats and backfills `history.yaml` |
| `Learn from my edits on this article` | Compares draft vs final and writes lessons |
| `Import reference articles and refresh the playbook` | Reads `corpus/` and outputs playbook analysis inputs |

## Installation

Requirements: Node.js >= 18, Python >= 3.9, and a verified WeChat Official Account with API access.

```bash
cd toolkit && npm install && npm run build && cd ..
pip install -r requirements.txt
cp config.example.yaml config.yaml
```

Recommended validation:

```bash
python3 scripts/validate_skill.py
npm run validate-skill
```

`config.yaml` fields:

| Field | Required | Purpose |
|------|----------|---------|
| `wechat.appid` | Yes | WeChat Official Account AppID |
| `wechat.secret` | Yes | WeChat Official Account AppSecret |
| `wechat.author` | No | Default article author name |
| `image.providers.gemini.api_key` | No | Gemini Imagen |
| `image.providers.openai.api_key` | No | OpenAI `gpt-image-1` |
| `image.providers.doubao.api_key` | No | Doubao Seedream |
| `image.providers.qwen.api_key` | No | DashScope `qwen-image-2.0-pro` |

## WeChat Setup

WeChat developer console: [developers.weixin.qq.com](https://developers.weixin.qq.com/platform?tab1=basicInfo&tab2=dev)

1. Open the official account management page.
2. Copy the `AppID`.
3. Reset and save the `AppSecret`.
4. Add your current public IP to the API IP whitelist.

Example:

```bash
curl -s https://ifconfig.me
```

## Optional: TrendRadar

TrendRadar is an optional topic-signal source for Step 2 topic intake.
If it is installed and reachable, the workflow can use it to fetch hotspot signals before topic selection.

Project:
- [TrendRadar](https://github.com/sansan0/TrendRadar)

Configuration in `config.yaml`:

```yaml
trendradar:
  enabled: true
  base_url: "http://127.0.0.1:3333/mcp"
  timeout_ms: 30000
```

Notes:
- TrendRadar is not required for drafting, formatting, preview, or publish.
- When enabled, Step 2 uses `scripts/fetch_trendradar_hotspots.py` to merge TrendRadar news from the last 1 day with RSS items from the last 1 day.
- The script emits one normalized JSON payload for downstream topic selection.
- If TrendRadar is unavailable, the skill falls back to `scripts/fetch_hotspots.py`.

## Workflow Tutorial

### 1. Workflow

| Step | What happens |
|------|--------------|
| Step 1 | Load client config and route the request |
| Step 2 | If no concrete topic is given, fetch topical signals |
| Step 3 | Pick the article angle |
| Step 3.5 | Pick the article framework |
| Step 4 | Draft the article |
| Step 5 | Run SEO and de-AI polish |
| Step 6 | Decide image scope, image style, and inline image density |
| Step 7 | Decide theme, generate HTML, preview or publish to drafts |
| Step 8 | Update `history.yaml`, backfill stats, learn edits, refresh playbook |

### 2. Style Guide

This skill handles two kinds of style:

- image style: how the cover and inline images look
- layout theme: how the final HTML / WeChat article reads

#### Image setup

| What you decide | Options | Meaning |
|-----------------|---------|---------|
| Image scope | `cover + inline images` / `cover only` / `inline only` / `no images` | Whether to generate a cover, inline images, both, or none |
| Image style | `follow article tone` / `editorial` / `blueprint` / `notion` / `warm` / `watercolor` / `scientific` / `lofi-doodle` / `multi-panel-manga` / `notebook-sketch` / `claymation` | Shared visual direction for the article's images |
| Inline image density | `minimal` / `balanced` / `per-section` / `custom` | How many inline images to generate |

#### Image styles

| Style key | Meaning | Best for |
|-----------|---------|----------|
| `follow article tone` | Auto-follow article tone | When you do not want to choose manually |
| `editorial` | Editorial infographic style | Methods, trend analysis, tool analysis |
| `blueprint` | Technical blueprint style | Architecture, systems, workflows |
| `notion` | Minimal hand-drawn line style | Knowledge sharing, productivity, SaaS |
| `warm` | Warm and friendly style | Stories, personal growth, lifestyle |
| `watercolor` | Soft watercolor style | Creative and light narrative content |
| `scientific` | Precise scientific diagram style | Technical, research, scientific analysis |
| `lofi-doodle` | Low-fidelity doodle style | Concept sketches, quick explanation |
| `multi-panel-manga` | Multi-panel manga explainer | Step-by-step processes, narrative scenes |
| `notebook-sketch` | Notebook concept sketch style | System sketches, abstract concepts |
| `claymation` | Clay / stop-motion toy style | Friendly educational content |

#### Inline image density

| Option | Meaning |
|--------|---------|
| `minimal` | A few key images, usually `1-2` |
| `balanced` | Standard density, usually `3-5` |
| `per-section` | Try to illustrate each strong section |
| `custom` | User specifies the number |

#### Layout themes

| Theme key | Best for |
|-----------|----------|
| `wechat-tech` | Technical breakdowns, tool analysis, workflow posts |
| `wechat-anthropic` | Softer essays, creator reflections |
| `wechat-default` | Safe general default |
| `wechat-medium` | Clean modern default |
| `latepost-depth` | Strong hierarchy, trend and judgment articles |
| `guardian` | Media-style commentary |
| `wechat-ft` | Business long-form essays |
| `wechat-deepread` | Dense long reading |
| `nikkei` | Technical and business analysis |
| `lemonde` | Deep reported reading tone |

If the user does not specify a theme, the workflow should either ask for one or explicitly tell the user which theme will be used.

### 3. Usage Modes

| Usage mode | When to use it | Example |
|------------|----------------|---------|
| Start from a topic | You have a topic but no draft yet | `Help me write a WeChat article about AI coding` |
| Start from Markdown | You already have Markdown and only need formatting, preview, or publish | `Format this Markdown for WeChat and publish it to drafts` |
| Start from a specific step | You want to enter at a specific workflow step | `Start from --step 3.5 and help me choose a framework` |
| Decide images first | You want to decide image scope, style, and density before generation | `Start from --step 6 and let me decide image settings` |
| Decide theme and publish | You already have the article and only need theme, preview, or publish | `Start from --step 7 and tell me which theme will be used` |
| Review and learning | You want stats, edit-learning, or playbook refresh | `Start from --step 8 and help me update history, stats, and lessons` |

## Common Commands

Full CLI syntax: [cli-reference.md](/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-wechat-article/references/cli-reference.md)  
Theme guidance: [theme-selection.md](/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-wechat-article/references/theme-selection.md)

```bash
# Preview
node dist/cli.js preview article.md --theme wechat-tech

# Publish
node dist/cli.js publish article.md --theme latepost-depth

# Theme comparison
node dist/cli.js theme-preview article.md

# Inline illustrations
node dist/cli.js illustrate article.md --client demo --style editorial --density balanced --provider qwen

# Cover generation
node dist/cli.js cover article.md --client demo --style blueprint --provider openai

# Stats backfill
node dist/fetch-stats.js --client demo --days 7

# Learn from edits
node dist/learn-edits.js --client demo --draft draft.md --final final.md

# Playbook analysis
node dist/build-playbook.js --client demo
```

If `--cover` is omitted during publish, the tool will try to use the first image in the article as the draft cover.
`illustrate` writes article output to `output/{client}/{date}-{title-slug}/`, including `article.md`, `assets/`, and `prompts/`.

The shared image style library lives in [references/image-system.yaml](/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-wechat-article/references/image-system.yaml). `clients/{client}/style.yaml` only stores default theme, writing profile, and client-specific overrides.

## Continuous Learning

This loop has three parts:

1. Feed corpus  
   Put representative historical articles, strong external reference pieces, and structure notes into `clients/{client}/corpus/`, then run `build-playbook`.

2. Learn from edits  
   After manual revisions, run `learn-edits` to write draft-vs-final differences into `lessons/`.

3. Refresh playbook  
   When `corpus/` is rich enough, or after about 5 new lessons, run `build-playbook` again and refresh `playbook.md`.

## Directory Structure

```text
clients/demo/
├── style.yaml
├── history.yaml
├── playbook.md
├── corpus/
├── lessons/
└── themes/
```

See [style-template.md](/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-wechat-article/references/style-template.md) for the client template. Publish records go to `history.yaml`, edit learning goes to `lessons/`, and `corpus/` acts as the reference article directory for future playbook refresh.

## Related Files

- [agents/openai.yaml](/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-wechat-article/agents/openai.yaml)
- [scripts/validate_skill.py](/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-wechat-article/scripts/validate_skill.py)
- [toolkit/src/image-gen.ts](/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-wechat-article/toolkit/src/image-gen.ts)
- [toolkit/src/fetch-stats.ts](/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-wechat-article/toolkit/src/fetch-stats.ts)
- [toolkit/src/build-playbook.ts](/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-wechat-article/toolkit/src/build-playbook.ts)
- [toolkit/src/learn-edits.ts](/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-wechat-article/toolkit/src/learn-edits.ts)

## License

MIT
