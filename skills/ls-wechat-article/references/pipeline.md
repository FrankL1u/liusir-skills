# Pipeline Execution Detail

## Step 1: Load client configuration

Read `{runtime_root}/clients/{client}/style.yaml`.

Routing:

- If the client directory does not exist, proactively ask the user how they want to initialize the client, then continue with onboarding guidance from `references/operations.md`. 
- If the user explicitly says `仅排版` / `仅发布` / `不要改内容`, skip directly to Step 6
- If the user already provided raw Markdown without that restriction, skip drafting but still run Step 4.5 before Step 6
- If the user gave a concrete topic, skip Steps 2-3 and go directly to Step 3.5
- If the user provided `--step N`, route directly to Step `N` and stop at that step's decision boundary

## Routing quick reference

| User input | Skip | Start from |
|------------|------|------------|
| Specific topic | Steps 2-3 | Step 3.5 |
| Raw Markdown with `仅排版` / `仅发布` / `不要改内容` | Steps 2-5 | Step 6 |
| Raw Markdown without that restriction | Steps 2-4 | Step 4.5 |
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

## Step 3.5: Framework choice and archetype routing

Use `references/frameworks.md` and `references/article-archetypes.md`.

- Generate framework proposals that match the selected topic
- Classify the article into one `article_archetype`
- Bind the archetype to one `output_shape`
- Prefer the framework that best supports the topic's core insight and the client's voice
- Fixed mapping:
  - `investigation` / `product_experience` / `phenomenon_analysis` -> `immersive_longform`
  - `tool_share` / `methodology` -> `structured_longform`
- In auto mode, select the strongest framework and continue
- If invoked via `--step 3.5`, present the framework proposals plus the chosen archetype and stop for user selection

## Step 4: Article drafting

Read `references/writing-guide.md`, `references/seo-rules.md`, and `{runtime_root}/clients/{client}/playbook.md` if it exists.

- Before drafting a new article, gather a small but fresh evidence pool: recent news, releases, product changes, market moves, or representative examples related to the article subject
- If the article claims to cover “latest”, “recent”, “trends”, “行业动态”, or current-state judgment, do not proceed without fresh source inputs
- Before drafting the body, run the title generation protocol from `references/seo-rules.md`
  - extract the article's core claim
  - identify the target reader and their likely concern
  - choose 2-3 title motivation types
  - generate at least 5 title candidates
  - label each candidate by motivation type
  - score the candidates
  - select one title as the H1
- Draft the article around the chosen title's promise; do not pick a title that the body cannot deliver
- Draft the article to match the selected framework, `article_archetype`, and `output_shape`
- Ground current-state claims, examples, and judgments in the fresh materials gathered before drafting
- If Step 2 was skipped because the user gave a concrete topic, do this freshness research here before writing
- Respect blacklist and tone settings
- Keep the article useful even without images or special formatting
- `immersive_longform`
  - default to `2800-5000` Chinese characters
  - allow `0-2` H2
  - emphasize a strong opening, main-thread callbacks, circular close, and culture/history lift
- `structured_longform`
  - default to `2200-3800` Chinese characters
  - keep `2-5` H2
  - every section must land one concrete action or judgment
  - `methodology` drafts must explain learning curve and failure points
- Save to `{runtime_root}/output/{client}/{YYYY-MM-DD}-{title-slug}/article.md`

Fallback:

- If fresh-info search fails, tell the user the freshness limitation and either ask for source links or continue only if the user accepts a non-live draft

## Step 4.5: Editorial QA

Read `references/seo-rules.md` and `references/editorial-qa.md`.

- Inspect the drafted article before any optional rewrite
- Optimize title, digest, and tags as recommendations or safe metadata edits
- Check rhythm, specificity, section pacing, source support, and live voice
- Identify which problems require shallow edits and which require deeper revision if the user later asks for fixes
- Write `quality-report.md` beside the article bundle
- After QA, give the user a concise repair plan
- L3 and L4 warnings do not block the workflow
- Only hard publish failures, missing title, or invalid structure can block Step 6 later

Step 4.5 is diagnostic first. Do not silently rewrite the article during QA.
The repair plan must name the top fixes, classify them by priority, and state whether each fix would require a shallow edit or targeted section rewrite. Do not apply those fixes unless the user explicitly asks for revision.

## Step 5: Cover image

Read `references/visual-prompts.md` and `references/visual-prompt-system.md`.

Visual configuration is stored in `{runtime_root}/clients/{client}/style.yaml` under `visuals`.

If `visuals` is missing, ask the user for the complete first-run visual configuration.
Every item may be skipped. When the user skips or does not set an item, use the default from `references/visual-prompt-system.md`, then write the resolved values into `style.yaml.visuals` and continue.

1. Image scope
   - `cover+inline`
   - `cover-only`
   - `inline-only`
   - `none`
2. Style direction
   - `follow article tone`
   - or a configured style key / style name from `references/visual-prompt-system.md`
3. Palette
   - `default`
   - `macaron`
   - `mono-ink`
   - `neon`
   - `warm`
4. Cover type
   - `typography` by default
   - or `hero`, `conceptual`, `metaphor`, `scene`, `minimal`
5. Cover mood
   - `balanced` by default
   - or `subtle`, `bold`
6. Cover font
   - `clean` by default
   - or `handwritten`, `serif`, `display`
7. Cover text level
   - `title-only` by default
   - or `none`, `title-subtitle`, `text-rich`
8. Cover aspect
   - `2.35:1` by default
9. Inline density
   - `balanced` by default (`3-5 images`)
   - or `minimal`, `per-section`, `rich`, `none`
10. Inline type default
   - `auto` by default
   - or `infographic`, `scene`, `flowchart`, `comparison`, `framework`, `timeline`

If `visuals` already exists, do not ask. Follow it.

If the user changes visual settings for the current run, execute with the changed settings, then ask whether to write the changed `visuals` back for future runs. If the user says "以后都这样", write back directly.

Run cover generation only when `visuals.scope` is `cover+inline` or `cover-only`.

Command mapping:

- run `cli.js cover` with `--style`, `--palette`, `--type`, `--mood`, `--cover-font`, `--text-level`, and `--aspect`
- default `--type` is `typography`
- default `--text-level` is `title-only`

If image generation fails, return prompt-only guidance and continue.

## Step 5.5: Inline images

Run inline generation only when `visuals.scope` is `cover+inline` or `inline-only`.

The toolkit must not infer image positions or image types. The agent chooses explicit targets before invoking the CLI:

- choose exact inline target positions
- prefer paragraph/content-block anchors over section headings
- use H2/H3 headings only as fallback
- convert `inline.type_default: auto` into one explicit inline type per target

Default inline density:

- `balanced` -> `3-5 images`

Command mapping:

- run `cli.js illustrate` with `--style`, `--palette`, and explicit `--target "{position_anchor}::{inline_type}"` entries
- `position_anchor` may be either an exact H2/H3 heading or a distinctive paragraph/content-block excerpt
- do not pass density to the CLI as a substitute for explicit targets

If `visuals.scope` is `none`, skip Step 5 and Step 5.5 and continue to Step 6.

## Step 6: Format and publish

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

Editorial QA interaction:

- If Step 4.5 produces only L3/L4 warnings, continue unless the user asks to revise
- If Step 4.5 finds blocking issues, stop before publishing and report the required fixes

## Step 7: History and learning

- `cli.js publish` appends draft metadata to `{runtime_root}/clients/{client}/history.yaml` after draft creation succeeds
- Client inference comes from the markdown path under `{runtime_root}/output/{client}/...`; if the path is custom, the agent may pass `--client {client}` explicitly
- Use `fetch-stats.js` later to backfill stats
- Use `learn-edits.js` and `build-playbook.js` to improve future drafts
