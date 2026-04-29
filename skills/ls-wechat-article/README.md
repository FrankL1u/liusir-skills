# LS WeChat Article Skill

Universal WeChat Official Account workflow skill. It can draft articles, format Markdown, preview HTML, generate cover and inline images, publish to WeChat drafts, backfill stats, and learn from human edits.

## Capabilities

| You say | The skill does |
|---------|----------------|
| `Write a WeChat article for demo` | Runs the full workflow: topic -> framework + archetype -> title + draft -> editorial QA -> cover/inline images -> theme -> draft publish |
| `Publish this Markdown to WeChat drafts` | Skips drafting. If you did not forbid content changes, it still runs diagnostic editorial QA before publish |
| `Preview this article with latepost-depth` | Generates a local HTML preview |
| `Show the last 7 days of article performance` | Fetches WeChat datacube stats and backfills `history.yaml` |
| `Learn from my edits on this article` | Compares draft vs final and writes lessons |
| `Import reference articles and refresh the playbook` | Reads `corpus/` and outputs playbook analysis inputs |

## Installation

Requirements: Node.js >= 18, Python >= 3.9, and a verified WeChat Official Account with API access.

```bash
cd toolkit && npm install && npm run build && cd ..
pip install -r requirements.txt
mkdir -p .ls-wechat-article
cp config.example.yaml .ls-wechat-article/config.yaml
```

Runtime data is resolved in this order:

1. `./.ls-wechat-article/`
2. `~/.liusir-skills/ls-wechat-article/`
3. legacy skill-local files as a read-only fallback

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

Configuration in `.ls-wechat-article/config.yaml` or `~/.liusir-skills/ls-wechat-article/config.yaml`:

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
- Before drafting a new article, the workflow should first search for the latest related information. This applies to writing flows, not to format-only or publish-only flows.

## Workflow Tutorial

### 1. Workflow

| Step | What happens |
|------|--------------|
| Step 1 | Load client config and route the request |
| Step 2 | If no concrete topic is given, fetch topical signals |
| Step 3 | Pick the article angle |
| Step 3.5 | Pick the framework, article archetype, and output shape |
| Step 4 | Search the latest related information, generate and score title candidates, select the H1, then draft with archetype-bound writing rules |
| Step 4.5 | Run editorial QA, write `quality-report.md`, and report repair suggestions |
| Step 5 | Generate the cover image from `style.yaml.visuals` |
| Step 5.5 | Plan explicit inline targets, then generate inline images |
| Step 6 | Decide theme, generate HTML, preview or publish to drafts |
| Step 7 | Update `history.yaml`, backfill stats, learn edits, refresh playbook |

### 2. Style Guide

This skill handles two kinds of style:

- image style: how the cover and inline images look
- layout theme: how the final HTML / WeChat article reads

#### Image setup

Image configuration only uses `style.yaml.visuals`. Legacy fields such as `cover_style`, `image_system`, and `reference_accounts` are no longer used.

```yaml
visuals:
  scope: "cover+inline"
  style: "follow article tone"
  palette: "default"
  cover:
    type: "typography"
    mood: "balanced"
    font: "clean"
    text_level: "title-only"
    aspect: "2.35:1"
  inline:
    density: "balanced"
    type_default: "auto"
```

If `style.yaml` has no `visuals`, ask for the complete first-run visual configuration, then write `visuals`. The user may skip any field; skipped fields use the defaults from `references/visual-prompt-system.md`. Later runs follow `visuals` without asking unless the user changes the setting for the current run.

| Field | Options | Default | Meaning |
|-------|---------|---------|---------|
| `visuals.scope` | `cover+inline` / `cover-only` / `inline-only` / `none` | `cover+inline` | Whether to generate cover, inline images, both, or none |
| `visuals.style` | `follow article tone` / `editorial` / `blueprint` / `notion` / `warm` / `watercolor` / `scientific` / `lofi-doodle` / `multi-panel-manga` / `notebook-sketch` / `claymation` | `follow article tone` | Shared visual direction for all article images |
| `visuals.palette` | `default` / `macaron` / `mono-ink` / `neon` / `warm` | `default` | Color palette |
| `visuals.cover.type` | `hero` / `conceptual` / `typography` / `metaphor` / `scene` / `minimal` | `typography` | Cover composition type; default is title-led |
| `visuals.cover.mood` | `subtle` / `balanced` / `bold` | `balanced` | Cover visual intensity |
| `visuals.cover.font` | `clean` / `handwritten` / `serif` / `display` | `clean` | Cover typography direction |
| `visuals.cover.text_level` | `none` / `title-only` / `title-subtitle` / `text-rich` | `title-only` | Cover text density; default uses only the article title |
| `visuals.cover.aspect` | `2.35:1` | `2.35:1` | WeChat cover aspect ratio |
| `visuals.inline.density` | `minimal` / `balanced` / `per-section` / `rich` / `none` | `balanced` | Inline image quantity rule; default is 3-5 images |
| `visuals.inline.type_default` | `auto` / `infographic` / `scene` / `flowchart` / `comparison` / `framework` / `timeline` | `auto` | Default inline image type; `auto` means the agent explicitly selects a type per target |

#### Image styles

| Style key | Meaning | Best for |
|-----------|---------|----------|
| `follow article tone` | Agent follows the article tone | When you do not want to choose manually |
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

#### Palettes

| Palette key | Meaning | Best for |
|-------------|---------|----------|
| `default` | Follow the selected style's default palette | General use |
| `macaron` | Soft pastel color blocks | Friendly and light educational content |
| `mono-ink` | Black-and-white ink lines | Sketches, manga, structural explanation |
| `neon` | Dark high-saturation neon | AI, tools, future-facing technology |
| `warm` | Warm reading-friendly colors | Narrative, opinion, and personal experience articles |

#### Cover types

| Type key | Meaning | Best for |
|----------|---------|----------|
| `hero` | One dominant focal subject | Strong first-glance impact |
| `conceptual` | Abstract visual system | Explaining a core concept |
| `typography` | Title-led poster composition | Default cover, title-first articles |
| `metaphor` | Concrete symbolic object or structure | Argument-driven pieces |
| `scene` | Work, life, or narrative scene | Tone-setting covers |
| `minimal` | Single focal element and whitespace | Quiet, restrained covers |

#### Inline image density

| Option | Meaning |
|--------|---------|
| `minimal` | A few key images, usually `1-2` |
| `balanced` | Standard density, usually `3-5` |
| `per-section` | Try to illustrate each strong section |
| `rich` | Cover more high-value visual positions in long articles |
| `none` | Do not generate inline images |

#### Inline image types

| Type key | Meaning |
|----------|---------|
| `auto` | Agent chooses one explicit type for each inline target |
| `infographic` | Modular information graphic with numbers and hierarchy |
| `scene` | A readable visual scene based on the paragraph |
| `flowchart` | Steps, arrows, sequence, and transitions |
| `comparison` | Before/after, option comparison, or tradeoff layout |
| `framework` | Modules, layers, and system relationships |
| `timeline` | Stages, milestones, or evolution over time |

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
| `wechat-nyt` | Long-form reporting and feature writing |
| `wechat-deepread` | Dense long reading |
| `nikkei` | Technical and business analysis |
| `lemonde` | Deep reported reading tone |
| `wechat-elegant` | Personal essays and softer creator writing |
| `kenya-emptiness` | Strong whitespace and experimental tone |
| `hische-editorial` | Illustration-heavy editorial identity |
| `ando-concrete` | Cool, architectural, highly ordered layouts |
| `gaudi-organic` | Organic curves and creative expression |
| `wechat-jonyive` | Minimal product and design writing |
| `wechat-apple` | Apple-like product launches and product analysis |

If the user does not specify a theme, the workflow should either ask for one or explicitly tell the user which theme will be used.

#### Title generation rules

Before drafting the body in Step 4, the workflow reads [seo-rules.md](./references/seo-rules.md), generates and scores title candidates, then writes the selected H1 into `article.md`.

The title is not a summary; it is a reason to click. Each candidate should use at least one motivation:

- clear point of view
- curiosity question
- cognitive contrast
- suspense gap
- pain point or benefit

Step 4.5 checks title length, core keyword position, whether the body delivers the title promise, and whether the digest avoids repeating the title.

### 3. Usage Modes

| Usage mode | When to use it | Example |
|------------|----------------|---------|
| Start from a topic | You have a topic but no draft yet | `Help me write a WeChat article about AI coding` |
| Start from Markdown | You already have Markdown and need formatting, preview, or publish. By default the skill still runs diagnostic editorial QA unless you say `publish only` or `do not change content` | `Format this Markdown for WeChat and publish it to drafts` |
| Start from a specific step | You want to enter at a specific workflow step | `Start from --step 3.5 and help me choose a framework` |
| Decide cover first | You want to review cover settings before generation | `Start from --step 5 and show me the cover plan` |
| Decide inline images first | You want to review explicit inline targets before generation | `Start from --step 5.5 and show me inline image targets` |
| Decide theme and publish | You already have the article and only need theme, preview, or publish | `Start from --step 6 and tell me which theme will be used` |
| Review and learning | You want stats, edit-learning, or playbook refresh | `Start from --step 7 and help me update history, stats, and lessons` |

## Common Commands

Full CLI syntax: [cli-reference.md](./references/cli-reference.md)  
Theme guidance: [theme-selection.md](./references/theme-selection.md)

```bash
# Preview
node dist/cli.js preview article.md --theme wechat-tech

# Publish
node dist/cli.js publish article.md --theme latepost-depth

# Editorial QA
node dist/cli.js editorial-qa article.md --client demo

# Theme comparison
node dist/cli.js theme-preview article.md

# Inline illustrations
node dist/cli.js illustrate article.md --client demo --style editorial --palette default --target "先定义输入，再定义输出，最后定义回看路径::flowchart" --target "不要把验证留到最后，应该让验证跟执行一起发生::framework" --provider qwen

# Cover generation
node dist/cli.js cover article.md --client demo --style blueprint --palette default --type typography --text-level title-only --provider openai

# Stats backfill
node dist/fetch-stats.js --client demo --days 7

# Learn from edits
node dist/learn-edits.js --client demo --draft draft.md --final final.md

# Playbook analysis
node dist/build-playbook.js --client demo
```

The HTML preview automatically renders `cover.png` / `cover.jpg` / `cover.jpeg` / `cover.webp` from the article directory at the top of the page. Publishing to WeChat drafts does not insert that cover image into the article body.
To use the Step 5 cover during publish, pass it explicitly with `--cover cover.png`. If `--cover` is omitted, the tool will try to use the first image in the article as the draft cover.
`editorial-qa` writes `quality-report.md` into the article bundle and keeps Step 4.5 quality judgment explicit instead of hiding it inside the agent response.
`illustrate` writes article output to `{runtime_root}/output/{client}/{date}-{title-slug}/`, including `article.md`, `assets/`, and `prompts/`. The toolkit no longer chooses positions or image types on its own; pass explicit `--target` entries from the agent. Prefer paragraph/content-block anchors; heading targets remain supported as a fallback for backward compatibility.

The shared visual prompt system lives in [references/visual-prompt-system.md](./references/visual-prompt-system.md). Runtime client data lives under `{runtime_root}/clients/{client}/style.yaml` and stores `visuals` together with writing profile and default theme.

## Continuous Learning

This loop has three parts:

1. Feed corpus  
   Put representative historical articles, strong external reference pieces, and structure notes into `{runtime_root}/clients/{client}/corpus/`, then run `build-playbook`.

2. Learn from edits  
   After manual revisions, run `learn-edits` to write draft-vs-final differences into `lessons/`.

3. Refresh playbook  
   When `corpus/` is rich enough, or after about 5 new lessons, run `build-playbook` again and refresh `playbook.md`.

## Directory Structure

```text
{runtime_root}/clients/demo/
├── style.yaml
├── history.yaml
├── playbook.md
├── corpus/
├── lessons/
└── themes/
```

See [style-template.md](./references/style-template.md) for the client template. Publish records go to `{runtime_root}/clients/{client}/history.yaml`, edit learning goes to `{runtime_root}/clients/{client}/lessons/`, and `corpus/` acts as the reference article directory for future playbook refresh.

## Related Files

- [agents/openai.yaml](./agents/openai.yaml)
- [scripts/validate_skill.py](./scripts/validate_skill.py)
- [toolkit/src/image-gen.ts](./toolkit/src/image-gen.ts)
- [toolkit/src/fetch-stats.ts](./toolkit/src/fetch-stats.ts)
- [toolkit/src/build-playbook.ts](./toolkit/src/build-playbook.ts)
- [toolkit/src/learn-edits.ts](./toolkit/src/learn-edits.ts)

## License

MIT
