# Pipeline Execution Detail

## Step 1: Load client configuration

Read `{runtime_root}/clients/{client}/style.yaml`.

Routing:

- If the client directory does not exist, proactively ask the user how they want to initialize the client, then continue with onboarding guidance from `references/operations.md`. 
- If the user already provided raw Markdown, skip directly to Step 7
- If the user gave a concrete topic, skip Steps 2-3 and go directly to Step 3.5
- If the user provided `--step N`, route directly to Step `N` and stop at that step's decision boundary

## Routing quick reference

| User input | Skip | Start from |
|------------|------|------------|
| Specific topic | Steps 2-3 | Step 3.5 |
| Raw Markdown | Steps 2-6 | Step 7 |
| `--step N` | Depends on `N` | Step `N` |

## Step 2: Topic intake

Run topic intake only when the user did not provide a concrete topic.

Preferred order:

1. If TrendRadar is available, ask the user which source to use:
   - `scripts/fetch_trendradar_hotspots.py`
   - `scripts/fetch_hotspots.py`
2. If TrendRadar is unavailable, use `scripts/fetch_hotspots.py`
3. Direct user topic input

Execution notes:

- When TrendRadar is enabled and reachable in `{runtime_root}/config.yaml`, proactively ask the user whether Step 2 should use TrendRadar or the general hot-board script
- Prefer `AskUserQuestion` when the host provides it; otherwise ask a concise plain-text question
- Only auto-fall back to `scripts/fetch_hotspots.py` when TrendRadar is unavailable or unreachable
- `scripts/fetch_hotspots.py` may be slower because some upstream platforms can return transient errors and trigger built-in retries
- `scripts/fetch_trendradar_hotspots.py` should merge TrendRadar news from the last 1 day with RSS items from the last 1 day
- The merged payload remains normalized JSON shaped as `{ timestamp, sources, count, items }`
- Step 3 consumes that merged JSON signal pool, not a pre-extracted keyword list
- Treat both scripts as signal providers only; topic choice still depends on client fit and angle judgment

For every source, filter by client fit:

- match against `{runtime_root}/clients/{client}/style.yaml` topics
- prefer items that can lead to a strong point of view
- discard general news with no natural bridge to the client's audience

Fallback:

- If hotspot fetching fails, ask the user for a topic directly
- Do not rely on removed external reference integrations in this phase

## Step 3: Topic selection and framework choice

Use `references/topic-selection.md`.

- Generate candidate topics when needed
- Pick one angle with a clear core insight
- Score candidates by heat, audience fit, angle value, engagement potential, and insight potential
- In auto mode, select the strongest topic and continue
- If invoked via `--step 3`, present the candidates and stop for user selection

## Step 3.5: Framework choice

Use `references/frameworks.md`.

- Generate framework proposals that match the selected topic
- Prefer the framework that best supports the topic's core insight and the client's voice
- In auto mode, select the strongest framework and continue
- If invoked via `--step 3.5`, present the proposals and stop for user selection

## Step 4: Article drafting

Read `references/writing-guide.md` and `{runtime_root}/clients/{client}/playbook.md` if it exists.

- Draft the article to match the selected framework
- Respect blacklist and tone settings
- Keep the article useful even without images or special formatting
- Save to `{runtime_root}/output/{client}/{YYYY-MM-DD}-{title-slug}/article.md`

## Step 5: SEO and de-AI pass

Read `references/seo-rules.md`.

- Optimize title, digest, and tags
- Remove generic AI-sounding phrasing
- Check rhythm, specificity, and section pacing

## Step 6: Visuals

Read `references/visual-prompts.md`.

This is the only mandatory question in auto mode unless the user already specified the answers.

Preferred path: use `AskUserQuestion` when the host provides it.
If `AskUserQuestion` is not available, ask a concise plain-text question that covers the same three decisions.

Ask the user about:

1. Image scope
   - `cover + inline images`
   - `cover only`
   - `inline only`
   - `no images`
2. Style direction
   - `follow article tone`
   - or a configured style key / style name
3. Inline image density
   - `minimal` -> `1-2 images`
   - `balanced` -> `3-5 images`
   - `per-section` -> try to illustrate each strong section
   - `custom` -> user specifies image count

After that intake, the agent must make the actual visual decisions before invoking the CLI:

- choose one explicit `cover type`
- choose the exact inline target sections
- choose one explicit `inline type` for each target section

Do not ask the toolkit to infer article type, image type, or target sections from the Markdown.

Defaulting rules:

- If the user wants visuals but gives no style direction, default to `follow article tone`
- If the user gives a style direction but no image scope, ask once for image scope before generating
- If the user wants inline images but gives no density, default to `balanced`
- If the user says nothing about image scope but still wants visuals, default to `cover + inline images`

Generate images with `image-gen.js` using configured providers. If no provider is available, return prompt-only guidance and continue.
Write prompts and generated images into the article bundle directory.

Command mapping:

- `cover + inline images`
  - run `cli.js cover` with the selected `--style` and explicit `--type`
  - then run `cli.js illustrate` with the selected `--style` and explicit `--target "{heading}::{inline_type}"` entries
- `cover only`
  - run `cli.js cover` with the selected `--style` and explicit `--type`
- `inline only`
  - run `cli.js illustrate` with the selected `--style` and explicit `--target "{heading}::{inline_type}"` entries
- `no images`
  - skip Step 6 and continue to Step 7

Parameter mapping:

- pass the chosen style direction to `--style`
- pass the agent-chosen cover type to `cli.js cover --type {hero|conceptual|typography|metaphor|scene|minimal}`
- pass each agent-chosen inline target to `cli.js illustrate --target "{heading}::{framework|flowchart|comparison|infographic|scene|timeline}"`
- use inline density only to decide how many targets to choose; do not pass density to the CLI as a substitute for explicit targets
- do not add extra orchestration layers; the agent should call the existing `cover` and `illustrate` commands directly

Preferred configured styles:

- `editorial` / `杂志信息图风`
- `blueprint` / `技术蓝图风`
- `notion` / `极简手绘线条风`
- `warm` / `温暖亲和风`
- `watercolor` / `水彩柔和风`
- `scientific` / `学术精确图表风`
- `lofi-doodle` / `低保真手绘涂鸦风`
- `multi-panel-manga` / `多格漫画说明风`
- `notebook-sketch` / `笔记本草图概念风`
- `claymation` / `黏土定格玩具风`

- In auto mode, after this one question is answered, continue through image generation.
- If invoked via `--step 6`, ask the question, present the image plan, and stop for confirmation or selection.

## Step 7: Format and publish

Use `cli.js publish` with theme settings from `style.yaml` or explicit overrides.

Theme handling:

- Do not silently render HTML with an implicit theme unless the user already specified one or the workflow is in full auto mode
- If the user did not specify a theme, either:
  - ask which theme to use, or
  - explicitly tell the user which theme will be used and why
- When auto-selecting, choose from `references/theme-selection.md` based on article shape, structure, and reading density
- The user should always know the theme choice before preview or publish proceeds

Cover handling:

- If an explicit cover asset exists, pass it with `--cover` and upload it as the draft cover
- If `--cover` is omitted, `cli.js publish` will fall back to the first image found in the article content
- If there is no explicit cover and no article image, publish without a cover upload

Always publish directly to WeChat drafts when the workflow reaches this step. Do not ask for publish confirmation.

Fallback:
- If publish fails, run `cli.js preview` and return the local preview path

## Step 8: History and learning

- `cli.js publish` appends draft metadata to `{runtime_root}/clients/{client}/history.yaml` after draft creation succeeds
- Client inference comes from the markdown path under `{runtime_root}/output/{client}/...`; if the path is custom, the agent may pass `--client {client}` explicitly
- Use `fetch-stats.js` later to backfill stats
- Use `learn-edits.js` and `build-playbook.js` to improve future drafts
