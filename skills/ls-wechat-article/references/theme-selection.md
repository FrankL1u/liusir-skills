# Theme Selection Guide

Use this guide to choose a built-in WeChat theme before preview or publish.

Theme choice is a public strategy layer:

- do not hardcode theme routing for a single client
- use article structure, tone, and density to choose a default
- use preview to compare 2-3 serious candidates before publish when the choice matters

## Quick Matrix

| Article shape | Recommended themes | Why | Avoid when |
|---------------|--------------------|-----|------------|
| Judgment Breakdown | `latepost-depth`, `wechat-anthropic`, `guardian` | Strong section hierarchy, clear opinion density, works for "this event actually means X" | The article is mostly tutorial or code-heavy |
| Technical Breakdown | `wechat-tech`, `wechat-deepread`, `nikkei` | Better for mechanism explanation, code blocks, dense lists, operational clarity | The article is mostly narrative or emotional |
| Deep reported essay | `wechat-ft`, `wechat-nyt`, `lemonde` | Strong long-read feel, calmer pacing, editorial credibility | The article depends on product screenshots or modern app aesthetics |
| Personal reflection / creator memo | `wechat-anthropic`, `wechat-elegant`, `wechat-medium` | Softer rhythm, warmer reading atmosphere, less "media outlet" pressure | The piece needs aggressive authority or strong debate framing |
| Fast utility post / default publish | `wechat-default`, `wechat-tech`, `wechat-medium` | Safe, readable, low-risk defaults for common newsletter-style posts | You need a distinctive brand atmosphere |
| Opinionated feature / media-style package | `latepost-depth`, `guardian`, `wechat-ft` | Strong visual identity, section breaks hold attention well | The article is short and practical rather than argumentative |

## Theme Notes

### Safe general-use defaults

- `wechat-tech`: best all-around default for technical, product, and workflow writing
- `wechat-anthropic`: good for softer but still premium-feeling essays
- `wechat-default`: safest fallback when readability matters more than identity
- `wechat-medium`: simple and modern without over-styling

### Best for strong hierarchy

- `latepost-depth`
- `guardian`
- `wechat-ft`

Use these when section titles need to carry argument weight.

### Best for long reading comfort

- `wechat-deepread`
- `wechat-anthropic`
- `nikkei`
- `lemonde`

Use these when the article wins by pacing, density, and sustained reading.

### More experimental / distinctive

- `kenya-emptiness`
- `hische-editorial`
- `ando-concrete`
- `gaudi-organic`
- `wechat-jonyive`
- `wechat-apple`

These are useful as public presets, but they should usually be previewed before publish. They have stronger aesthetic fingerprints and are easier to mismatch with the article.

## Selection Rules

1. Start from the framework, not from personal taste.
2. If the article depends on section argument and emphasis, prefer stronger hierarchy themes.
3. If the article depends on calm, continuous reading, prefer softer long-read themes.
4. If the article contains code blocks, lists, or method steps, prefer cleaner technical themes.
5. If you are unsure, preview `wechat-tech`, `wechat-anthropic`, and one stronger candidate.

## Practical Default Set

When a user only asks for "a good theme" and does not specify a house style:

- technical / theory-heavy: `wechat-tech`
- judgment / trend analysis: `latepost-depth`
- softer essay / creator reflection: `wechat-anthropic`
- conservative fallback: `wechat-default`
