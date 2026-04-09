# CLI Reference

Run commands from `toolkit/` after `npm run build`.

## Primary commands

```bash
node dist/cli.js preview {markdown_path} [--preset {preset}] [--style {style}] [--layout {layout}]
node dist/cli.js series {series_plan_path} [--provider {provider}] [--preset {preset}] [--style {style}] [--layout {layout}] [--yes]
node dist/cli.js styles
node dist/cli.js layouts
node dist/cli.js presets
```

## Command roles

`preview`

- lightweight inspection helper
- useful for checking preset resolution and visual defaults without entering the image workflow
- preset should be the first input; style/layout are advanced overrides
- does not infer titles, hooks, hashtags, or posting copy

`series`

- main Step 5 image generation command
- consumes a completed `series-plan.json`
- writes prompt files and `series-manifest.json`
- does not infer a dedicated opening page
- if an older plan still contains `cover`, CLI will normalize it to `content`

`styles / layouts / presets`

- visual selection helpers
- `presets` is the primary list
- `styles` and `layouts` are override lists

## Bundle layout

Default output directory when Step 4 and Step 5 artifacts are written:

```text
output/{client}/{YYYY-MM-DD}-{slug}/
```

Current bundle files:

- `source-article.md`
- `note.md`
- `series-outline.md`
- `series-plan.json`
- `series-manifest.json`
- `prompts/`
- `images/`

## Step 5 contract

Create these files before running `series`:

- `series-outline.md`
- `series-plan.json`

Input priority for Step 5:

- `preset` defines the default overall visual scheme
- `note.md` defines slide order and the core point of each slide
- `source-article.md` provides support material for the same slide points
- `style` and `layout` only override the preset when needed
- support material may enrich a slide, but it must not replace the note's structure
- prompt text itself should be authored by the agent from the reference rules, then passed into `series`
- do not add a dedicated cover decision field to `series-plan.json`
- if a first-screen opening page is needed, write it as the first `content` slide

Minimal `series-plan.json` shape:

```json
{
  "markdownPath": "/abs/path/to/note.md",
  "client": "demo",
  "slug": "workflow-note",
  "preset": "knowledge-card",
  "style": "clean-grid",
  "layout": "dense",
  "slides": [
    {
      "type": "content",
      "title": "Opening point",
      "prompt": "Full prompt text"
    },
    {
      "type": "content",
      "title": "Point 1",
      "prompt": "Full prompt text"
    }
  ]
}
```

## Built-in helpers

Presets:

- `knowledge-card`
- `checklist`
- `tutorial`
- `study-guide`
- `poster`
- `editorial`
- `doodle-showdown`
- `blueprint-stack`
- `deep-dive-blueprint`
- `mascot-lab`
- `bold-statement`
- `mascot-checklist`

Styles:

- `clean-grid`
- `study-board`
- `contrast-poster`
- `handwritten-flow`
- `hand-doodle`
- `tech-blueprint`
- `mascot-infographic`
- `bold-type`

Layouts:

- `sparse`
- `balanced`
- `dense`
- `list`
- `comparison`
- `flow`

## Image generation

```bash
node dist/image-gen.js --prompt "{prompt}" --output {output_path} --size {series|inline} --provider {provider}
```

Fallback behavior:

- keep prompt files even when image generation fails
- continue image execution with prompt-only artifacts

## Internal maintenance commands

These commands are retained for internal maintenance compatibility and are not part of the main note workflow:

```bash
node dist/learn-edits.js --client {client} --draft {draft_path} --final {final_path}
node dist/learn-edits.js --client {client} --summarize
node dist/build-playbook.js --client {client}
```

## Validation

```bash
python3 ../scripts/validate_skill.py
```
