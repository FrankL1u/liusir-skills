# AGENTS

This repository is a WeChat Official Account article workflow skill.

It supports:
- topic-driven drafting
- Markdown formatting and preview
- optional cover and inline image generation
- publishing to WeChat drafts
- analytics backfill and edit-learning

## Project Rule

- Workflow strategy lives in Markdown docs.
- Repeatable execution lives in code.

Do not invent a separate high-level router in code unless a workflow step has clearly become a stable executable unit.

## Important Paths

- `/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-wechat-article/SKILL.md`
- `/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-wechat-article/references/pipeline.md`
- `/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-wechat-article/references/operations.md`
- `/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-wechat-article/references/visual-prompts.md`
- `/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-wechat-article/references/image-style-config.md`
- `/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-wechat-article/references/cli-reference.md`
- `/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-wechat-article/references/article-archetypes.md`
- `/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-wechat-article/references/editorial-qa.md`
- `/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-wechat-article/references/rewrite-examples.md`
- `/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-wechat-article/references/theme-selection.md`
- `/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-wechat-article/references/image-system.yaml`
- `/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-wechat-article/clients/{client}/style.yaml`
- `/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-wechat-article/toolkit/src/cli.ts`
- `/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-wechat-article/toolkit/src/illustration-workflow.ts`
- `/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-wechat-article/toolkit/src/cover-workflow.ts`
- `/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-wechat-article/toolkit/src/image-style-system.ts`
- `/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-wechat-article/toolkit/src/image-gen.ts`

## Setup

Run from the repository root:

```bash
cd toolkit && npm install && npm run build && cd ..
pip install -r requirements.txt
cp config.example.yaml config.yaml
python3 scripts/validate_skill.py
```

Required config:
- `wechat.appid`
- `wechat.secret`

Optional image providers:
- `image.providers.gemini`
- `image.providers.openai`
- `image.providers.doubao`
- `image.providers.qwen`

Client config conventions:
- `clients/{client}/style.yaml` stores writing profile, default public theme, and image defaults
- do not add dead typography fields back into `style.yaml` unless the execution layer actually consumes them
- global `config.yaml` still owns CLI defaults such as `theme`

## Main Workflows

### Full article flow

Use when the user gives a client and wants a full article:

```text
Step 1 -> Step 2 -> Step 3 -> Step 3.5 -> Step 4 -> Step 5 -> Step 6 -> Step 7
```

Routing is defined in:
- `/Users/frank/Documents/MyStudio/LS-SKILLS/ls-wechat-article/SKILL.md`
- `/Users/frank/Documents/MyStudio/LS-SKILLS/ls-wechat-article/references/pipeline.md`

### Raw Markdown flow

If the user already provides Markdown:

```text
default: Step 5A -> Step 5B -> Step 7
only if the user explicitly says publish-only / format-only / do-not-edit: Step 7
```

### Explicit step override

If the user provides `--step N`, route to that step and stop there after presenting the result.

## Commands

Run from:
- `/Users/frank/Documents/MyStudio/LS-SKILLS/ls-wechat-article/toolkit`

### Preview

```bash
node dist/cli.js preview article.md --theme wechat-tech
```

Use `/Users/frank/Documents/MyStudio/LS-SKILLS/ls-wechat-article/references/theme-selection.md` for public theme selection guidance.

### Publish

```bash
node dist/cli.js publish article.md --theme latepost-depth
```

For publish, a valid cover is still required. If `--cover` is omitted, the command will only reuse the first article image when one already exists.

### Editorial QA

```bash
node dist/cli.js editorial-qa article.md --client liusir2035
```

This writes:
- fixed `article.md`
- `quality-report.md`

### Generate cover

```bash
node dist/cli.js cover article.md --client liusir2035 --provider qwen
```

This uses:
- `cover_type × style`
- article content + client `image_system`
- output:
  - `cover.png`
  - `prompts/cover.prompt.txt`

### Generate inline images

```bash
node dist/cli.js illustrate article.md --client liusir2035 --provider qwen
```

This uses:
- section analysis
- inline type detection
- `inline_type × style`
- output:
  - `article.md`
  - `assets/inline-XX.png`
  - `prompts/inline-XX.prompt.txt`

### Style benchmark

```bash
node dist/cli.js style-benchmark --provider qwen --output-dir /abs/path/output/style-benchmark/run
```

## Image System

### Current architecture

Inline images and cover images now share the same formal style system.

Definitions live in:
- `/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-wechat-article/references/image-system.yaml`
- `/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-wechat-article/clients/{client}/style.yaml`
- `/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-wechat-article/toolkit/src/image-style-system.ts`

Interpretation:
- `theme` selects the public article layout preset

### Formal style keys

- `editorial`
- `blueprint`
- `notion`
- `warm`
- `watercolor`
- `scientific`
- `lofi-doodle`
- `multi-panel-manga`
- `notebook-sketch`
- `claymation`

### Cover types

- `hero`
- `conceptual`
- `typography`
- `metaphor`
- `scene`
- `minimal`

### Inline types

- `infographic`
- `scene`
- `flowchart`
- `comparison`
- `framework`
- `timeline`

### Character policy

Global rule:
- disallow realistic people
- allow non-realistic characters when the style requires them

Allowed examples:
- icons
- symbols
- stylized characters
- manga figures
- clay figures
- toy-like figures

Disallowed examples:
- photorealistic faces
- lifelike hands
- real-person portrait composition

## Current Implementation Boundaries

### Stable

- Markdown to WeChat HTML conversion
- WeChat draft publishing
- cover generation via `cover` command
- inline illustration generation via `illustrate` command
- formal image style config
- style alias mapping from older labels to formal style keys

### Important compatibility behavior

Older style phrases still map into formal styles, for example:
- `clean editorial tech` -> `editorial`
- `modern tech high contrast` -> `blueprint`

Do not remove these aliases unless the interaction layer has been updated everywhere.

## Output Structure

Default article bundle:

```text
output/{client}/{date}-{title-slug}/
├── article.md
├── quality-report.md
├── preview.html
├── cover.png
├── assets/
│   └── inline-XX.png
└── prompts/
    ├── cover.prompt.txt
    └── inline-XX.prompt.txt
```

Style benchmark output:

```text
output/style-benchmark/{date-or-run}/
├── overview.html
├── scores.md
├── matrix.json
├── prompts/
└── images/
```

## Editing Guidance

- Use `apply_patch` for source edits.
- Prefer keeping workflow routing in docs unless a step has become a stable executable path.
- Do not put client-specific language into public reference docs.
- Do not leave evaluation wording like “current conclusion”, “kept styles”, or “removed styles” in formal docs.
- Keep public docs generic; keep client-specific choices inside `clients/{client}/`.

## Verification

After changing toolkit source:

```bash
cd /Users/frank/Documents/MyStudio/LS-SKILLS/ls-wechat-article/toolkit
npm run build
cd /Users/frank/Documents/MyStudio/LS-SKILLS/ls-wechat-article
python3 scripts/validate_skill.py
```

If image generation logic changes, also run one real sample:
- one `cover`
- one `illustrate`

Do not claim the image workflow is updated unless both commands succeed against a real article.
