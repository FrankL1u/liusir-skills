# Style Presets

`preset` is the primary visual entry.

In practice, a preset is a stable overall scheme:

- one visual direction
- one default layout
- one content scenario

`style` and `layout` stay available as advanced overrides, but they should not be the first decision.

| Preset | Style | Layout | Best for |
|--------|-------|--------|----------|
| `knowledge-card` | `clean-grid` | `dense` | structured knowledge, framework notes, tool summaries |
| `checklist` | `clean-grid` | `list` | lists, rankings, pitfall collections |
| `tutorial` | `handwritten-flow` | `flow` | process notes, steps, operational explanation |
| `study-guide` | `study-board` | `dense` | recaps, case notes, layered breakdowns |
| `poster` | `contrast-poster` | `sparse` | one dominant claim, tension-driven covers, short judgment series |
| `editorial` | `contrast-poster` | `balanced` | opinion-driven notes with moderate detail |
| `doodle-showdown` | `hand-doodle` | `comparison` | concept clashes, versus slides, playful comparison covers |
| `blueprint-stack` | `tech-blueprint` | `dense` | agent systems, layered frameworks, production-grade breakdowns |
| `deep-dive-blueprint` | `tech-blueprint` | `balanced` | deeper explainers with a cleaner reading pace |
| `mascot-lab` | `mascot-infographic` | `balanced` | friendly explainers, skill overviews, approachable technical notes |
| `bold-statement` | `bold-type` | `sparse` | hard-hitting covers, one-line judgments, strong opening claims |
| `mascot-checklist` | `mascot-infographic` | `list` | recommendation lists, quick-start kits, practical checklists |

## Override rules

- default to `preset` only
- explicit `style` overrides the preset style
- explicit `layout` overrides the preset layout
- explicit overrides should still respect readability
- do not open overrides unless the preset is clearly mismatched

## Stability rules

- keep one preset for one series unless there is a strong reason to split
- avoid switching styles slide by slide
- avoid dense layouts for low-information claims
- when a preset already fits, keep the preset intact
