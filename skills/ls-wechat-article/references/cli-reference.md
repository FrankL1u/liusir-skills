# CLI Reference

All commands run from `{skill_dir}/toolkit/` after `npm run build`.

## Core commands

```bash
node dist/cli.js preview {markdown_path} --theme {theme_key}
node dist/cli.js publish {markdown_path} --theme {theme_key} [--client {client}]
node dist/cli.js editorial-qa {markdown_path} [--client {client}]
node dist/cli.js cover {markdown_path} --client {client} --style {follow article tone|editorial|blueprint|notion|warm|watercolor|scientific|lofi-doodle|multi-panel-manga|notebook-sketch|claymation} --palette {default|macaron|mono-ink|neon|warm} --type {hero|conceptual|typography|metaphor|scene|minimal} [--mood {subtle|balanced|bold}] [--cover-font {clean|handwritten|serif|display}] [--text-level {none|title-only|title-subtitle|text-rich}] [--aspect {2.35:1}] --provider {gemini|openai|doubao|qwen}
node dist/cli.js illustrate {markdown_path} --client {client} --style {follow article tone|editorial|blueprint|notion|warm|watercolor|scientific|lofi-doodle|multi-panel-manga|notebook-sketch|claymation} --palette {default|macaron|mono-ink|neon|warm} --target "{position anchor}::{framework|flowchart|comparison|infographic|scene|timeline}" [--target "..."] --provider {gemini|openai|doubao|qwen}
node dist/cli.js theme-preview {markdown_path}
node dist/cli.js themes
node dist/cli.js colors
```

If `--cover` is omitted, publish will attempt to use the first image in the article as the draft cover.
In the workflow, `editorial-qa` maps to Step 4.5. It writes `quality-report.md` beside the article bundle and may also materialize a standard `article.md` bundle when the input is outside `{runtime_root}/output/{client}/{date}-{title-slug}/`. It reports repair suggestions but does not imply automatic revision.
`illustrate` inserts generated inline images after agent-selected paragraph/content-block anchors by default, and falls back to matched `##` / `###` headings when the target is a heading. It writes a bundled article package under `{runtime_root}/output/{client}/{date}-{title-slug}/` by default.
`publish` writes the draft metadata back to `{runtime_root}/clients/{client}/history.yaml` after draft creation succeeds. It infers `{client}` from the article path under `{runtime_root}/output/{client}/...`; use optional `--client` only when the markdown path does not follow the default bundle layout.

Run `node dist/cli.js themes` to list every built-in preset theme.
Use [theme-selection.md](/Users/frank/Documents/MyStudio/LS-SKILLS/ls-wechat-article/references/theme-selection.md) to choose among built-in themes by article shape instead of client preference.

## Step 5 and Step 5.5 mapping

Use the existing commands directly:

- `cover+inline`
  - Step 5: `node dist/cli.js cover ... --style {style} --palette {palette} --type {cover_type}`
  - Step 5.5: `node dist/cli.js illustrate ... --style {style} --palette {palette} --target "{position_anchor}::{inline_type}" [--target "..."]`
- `cover-only`
  - Step 5: `node dist/cli.js cover ... --style {style} --palette {palette} --type {cover_type}`
- `inline-only`
  - Step 5.5: `node dist/cli.js illustrate ... --style {style} --palette {palette} --target "{position_anchor}::{inline_type}" [--target "..."]`
- `none`
  - skip image commands

Notes:

- `--style` accepts formal style keys and supported aliases
- `--palette` accepts palette keys from `references/visual-prompt-system.md`
- `--type` is required for `cover`; default workflow value is `typography`
- default cover text level is `title-only`
- `--target` is required for `illustrate`; the toolkit no longer ranks positions or infers inline image types
- `position_anchor` may be either an exact section heading or a distinctive paragraph/content-block excerpt
- inline density defaults to `balanced`, but the agent must convert that decision into explicit `--target` entries before calling `illustrate`

## Image generation

```bash
node dist/image-gen.js --prompt "{prompt}" --output {output_path} --size {cover|article} --provider {gemini|openai|doubao|qwen}
node dist/image-gen.js --search "{keywords}" --output {output_path}
node dist/image-gen.js --fallback-cover --output {output_path}
```

Current fallback behavior is prompt-only when no provider is configured or generation fails.

`qwen` provider uses Alibaba Cloud Bailian DashScope synchronous multimodal generation API.

## Analytics and learning

```bash
node dist/fetch-stats.js --client {client} --days 7
node dist/learn-edits.js --client {client} --draft {draft_path} --final {final_path}
node dist/learn-edits.js --client {client} --summarize
node dist/build-playbook.js --client {client}
```

## Validation

```bash
python3 ../scripts/validate_skill.py
```
