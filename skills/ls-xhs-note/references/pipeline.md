# Pipeline Execution Detail

## Step 1: Load client configuration

Read `clients/{client}/style.yaml`.

Routing:

- If the client directory does not exist, initialize the minimum client structure before continuing
- If the input is an existing note draft, skip topic intake and framework selection
- If the input is a concrete topic, skip topic intake and start from framework selection
- If the user provides `--step N`, route directly to Step `N` and stop at that step's decision boundary

## Routing quick reference

| Input type | Skip | Start from |
|------------|------|------------|
| Concrete topic | Step 2 | Step 3 |
| Existing note draft | Steps 2-4 | Step 5 |
| `--step N` | Depends on `N` | Step `N` |

## Step 2: Topic intake

Run topic intake only when no concrete topic has already been provided.

Source priority:

1. trend signals from configured scripts
2. manually supplied topic pool
3. direct user topic

Selection rules:

- Prefer angles with one visible tension
- Prefer angles that can be saved, copied, or debated
- Discard broad topics with no immediate action or judgment

Fallback:

- If signal gathering fails, request a direct topic and continue

## Step 3: Angle selection and framework choice

Choose one dominant angle before drafting.

Scoring dimensions:

- audience fit
- payoff clarity
- tension strength
- visual packaging potential
- replay value

Then choose one framework from `references/frameworks.md`.

Framework choice rules:

- use the framework that best carries the angle, not the broadest framework
- prefer one strong promise over multi-thread exposition
- choose a framework that can first hold a longer source article and then compress into a native note

If invoked via `--step 3`, present angle candidates and framework candidates, then stop.

## Step 4: Draft the note and polish posting copy

Read these files before drafting:

- `references/frameworks.md`
- `references/drafting-skeletons.md`
- `references/writing-guide.md`
- `references/title-rules.md`
- `references/xhs-constraints.md`
- `clients/{client}/playbook.md` if it exists

Step 4 is one continuous writing step:

1. expand the selected angle into a usable long-form source article
2. save that article as `source-article.md`
3. extract one dominant angle from the article
4. rewrite the article into platform-native `note.md`

Output rules:

- write platform-native note copy with model reasoning, not by relying on programmatic skeleton generation as the primary path
- write the source article and the note in the same step
- keep one dominant argument
- maintain enough section separation for later visual slicing
- save to `output/{client}/{YYYY-MM-DD}-{title-slug}/note.md`
- save the source article in the same bundle as `source-article.md`

Artifact rule:

- `note.md` is the primary publishing copy
- `source-article.md` is the support artifact generated inside the same step
- the source artifact is retained for Step 5 support, not as a separate workflow step

Polish rules:

- remove article-like warmup
- sharpen contrast and payoff
- keep the first screen fast to scan

Notes:

- the primary Step 4 path is model-authored writing guided by the reference files above
- there is no split between topic drafting and long-form derivation in the main workflow
- Step 4 content should not rely on CLI skeleton generators or heuristic post-processing

## Step 5: Generate images

Read these files before image generation:

- `references/visual-prompts.md`
- `references/style-selection.md`
- `references/style-presets.md`
- `references/workflows/prompt-assembly.md`

Step 5 is image generation.

Required outputs:

- `series-outline.md`
- `series-plan.json`
- prompt files
- generated images when a provider is available

Internal sequence within the same step:

1. confirm whether the user wants a dedicated first-screen opening page
2. if the user does not answer, default to no dedicated opening page
3. choose `preset`
4. open `style` or `layout` only if an override is clearly needed
5. define slide count
6. decide whether the first page should use a sparse opening expression or a regular content expression
7. use `note.md` to define page order and one core point per page
8. if `source-article.md` exists, pull only supporting details for the matching page point
9. assemble one prompt per page

Command mapping:

- main route
  - run `node dist/cli.js series {series-plan.json} --provider {provider}`

Default page structure:

- regular `content` pages
- optional first-screen opening page only when the user clearly asks for it
- optional `ending`

Default slide count:

- `4-6` for knowledge-heavy notes
- `3-4` for judgment-heavy notes
- `4-5` for story or comparison notes

Support rule:

- `note.md` decides what each slide is about
- `source-article.md` can only enrich a slide that already exists in `note.md`
- long-form support may add examples, short explanations, comparisons, or proof points
- long-form support must not change the note's main order or create a new branch that is absent from `note.md`
- a dedicated opening page is optional and must not be inferred silently
- if no opening page is requested, the series starts directly with the first content page
- `preset` is the primary visual decision
- `style` and `layout` are override levers, not parallel entry points

If invoked via `--step 5`, present the visual plan and stop.

## Step 6: Placeholder post-generation step

Keep this step empty for now.

Current rule:

- do not define export or publishing behavior here yet
- do not auto-advance into packaging or posting behavior
- reserve this step for later workflow adjustment

## Standalone maintenance tasks

The following tasks remain part of the skill, but they are not part of the main workflow steps above:

- client onboarding
- history maintenance

Use these tasks through `references/operations.md` and the related toolkit commands when needed.
