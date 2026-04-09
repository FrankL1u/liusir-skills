# Visual Prompt Guide

Use this file in Step 5 after the note draft is stable.

The purpose of the visual layer is to package the message into a readable series, not to decorate it.

The note body defines the visual spine.  
Long-form source material only supports the slides after the spine is already fixed.

## Output scope

Step 5 should produce:

- `series-outline.md`
- `series-plan.json`
- one prompt per slide
- one generated image per slide when a provider is available

The outline and plan files are internal bridge artifacts inside the same step.  
They are not separate workflow stages.

## Internal flow

1. confirm whether the user wants a dedicated first-screen opening page
2. if there is no explicit yes, default to no dedicated opening page
3. choose a preset
4. open `style` or `layout` overrides only when the preset is not enough
5. decide slide count
6. slice `note.md` into visual units
7. enrich matching slides with support from `source-article.md` when available
8. assemble prompts

## Source priority

Use source material in this order:

1. `note.md` for slide order and core message
2. `source-article.md` for supporting details on an already-defined slide

Do not:

- rebuild slide order from the long-form article
- add a new slide topic that is not present in the note
- let support material overpower the note's main judgment
- treat `style` and `layout` as equal to preset in the first decision step

## First page expression

Use a dedicated first-screen opening page only when the user clearly asks for one.

When it is used, the first page should carry:

- one promise
- one contradiction
- one pain statement
- one simple decision rule

Source rule:

- the opening page should come from the note's strongest top-level line
- do not mine extra long-form detail into the opening page

Avoid:

- dense paragraphs
- multiple competing claims
- long supporting explanation

If the user does not ask for a dedicated opening page:

- start directly with the first content page
- do not invent an extra title-only page
- let the first content page carry the series opening
## Content

Use content slides to carry:

- one point
- one step
- one contrast
- one framework layer
- one supporting proof block

Practical default:

- `2-5` short text blocks per slide
- one clear information role per slide

Source rule:

- choose the slide's core sentence from the note first
- use long-form support only to make that sentence clearer, richer, or more concrete
- good support material includes short examples, one contrast, one proof line, or one clarifying layer

## Ending

Use the ending slide to carry:

- a summary cue
- a save cue
- a discussion cue
- a follow-up direction

The ending slide should be lighter than a content slide.

Source rule:

- the ending should stay close to the note's final interaction or summary
- do not reopen long-form branches at the ending

## Slide count guidance

- list or technical note: `4-6`
- comparison or story note: `4-5`
- judgment-heavy note: `3-4`

Choose the lowest count that preserves clarity.

## Prompt-writing rules

- use full prompts, not keyword fragments
- keep the language aligned with the note
- maintain hierarchy before decoration
- treat readability as a primary requirement
- keep text volume within what the chosen style can carry

## Information density rules

- sparse layout: `1-2` dominant ideas
- balanced layout: `3-4` information blocks
- dense layout: `4-6` compact information blocks
- list layout: ranked or sequential items
- comparison layout: side-by-side contrast
- flow layout: steps or sequence

## Visual consistency rules

- keep style, color logic, and text hierarchy stable across the series
- let the first page define the visual anchor
- keep later slides close enough to feel like one set

## Fallback behavior

If automatic image generation is unavailable:

- keep the full slide outline
- keep the full prompt plan
- keep prompt files in the bundle
- continue to export package assembly
