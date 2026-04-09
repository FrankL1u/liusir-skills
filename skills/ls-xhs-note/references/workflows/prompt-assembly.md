# Prompt Assembly Guide

Use this file in Step 5 after the note and visual direction are already decided.

The agent should assemble one full prompt per slide.

Source order:

1. read `note.md` to get page order and core message
2. read `source-article.md` only if more support is needed for the same page

The prompt should inherit its main point from the note, not from the long-form source.

## Base structure

Every prompt should follow this structure:

```md
Create a portrait social graphic with these requirements:

## Image Specifications

- Format: infographic
- Orientation: portrait
- Aspect Ratio: 9:16
- Rendering Goal: illustration-first social card, not a photo

## Core Principles

- readability before decoration
- clear hierarchy before texture
- one dominant idea per slide
- compact text that remains legible
- visual consistency across the series

## Text Style

- integrated text, not pasted paragraphs
- strong heading hierarchy
- short supporting blocks
- no tiny dense copy
- visible text should be role-separated: headline, support, labels
- do not repeat the same sentence in both headline and body

## Language

- use the same language as the note
- keep punctuation consistent with the note

---

{STYLE_SECTION}

---

{LAYOUT_SECTION}

---

{CONTENT_SECTION}
```

## Style section

Describe:

- color logic
- illustration mood
- line quality
- text treatment
- what to avoid

## Layout section

Describe the chosen layout in plain language:

- `sparse`: low density, strong whitespace, `1-2` main blocks
- `balanced`: medium density, `3-4` blocks
- `dense`: compact cheat-sheet feel, `4-6` blocks
- `list`: stacked or ranked list structure
- `comparison`: two-column contrast structure
- `flow`: directional or step-based sequence

## Content section

The content section should contain:

- page role: `content | ending`
- core message
- text blocks in order
- visual concept
- support details, only when they strengthen the same point

The `Core Message` is for planning and hierarchy control.
It should guide the slide, but it should not be copied verbatim into every visible text block.

Suggested shape:

```md
## Content

- Position: content
- Core Message: {one sentence}
- Text Blocks:
  - {block 1}
  - {block 2}
  - {block 3}
- Support Details:
  - {optional support line from source-article.md}
  - {optional support line from source-article.md}
- Visual Concept: {what should be drawn}
```

## Extraction rule

For each slide:

1. choose the slide's core sentence from `note.md`
2. look for matching support in `source-article.md`
3. keep only support that sharpens the same point
4. stop when the slide is clear enough

Good support:

- one example
- one consequence
- one short comparison
- one clarifying sub-point

Weak support:

- background that restarts the article
- side branches not present in the note
- long explanation that makes the slide feel like a paragraph screenshot

## Text deduplication rule

For every slide:

1. decide one headline line
2. treat `Core Message` as the semantic center, not as text that must appear everywhere
3. if the headline already states the claim, lower blocks must switch to labels, proof points, or consequences
4. never repeat the exact same sentence in headline, center panel, and footer
5. if a phrase already appears in large type, shorten later mentions into keywords or fragments

Good:

- Headline: `回看路径一断，团队每次出问题都只能重新猜`
- Lower block: `先看哪一步先变形`
- Lower block: `再看哪一个交接点开始需要人工兜底`

Bad:

- Headline: `回看路径一断，团队每次出问题都只能重新猜`
- Lower block: `回看路径还在不在`
- Lower block: `回看路径一断，团队每次出问题都只能重新猜`

## Page-based rules

### Content

- one point per slide
- text blocks should stay short
- visuals should clarify the message structure
- support details should remain secondary to the slide's core line
- if the user asked for a dedicated opening page, the first content page may use sparse opening expression with one dominant line and minimal support
- if the user did not ask for it, the first content page should open directly with usable substance

### Ending

- one recap or action cue
- lighter information load than content slides

## Output contract

Materialize these artifacts within Step 5 before calling CLI:

- `series-outline.md`
- `series-plan.json`
- `prompts/{NN}-{type}-{slug}.md`

`series-plan.json` is the bridge between planning and generation.  
The file should contain every page role, title, prompt, and output path that the image command needs.
