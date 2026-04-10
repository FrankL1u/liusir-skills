# Editorial QA

Use this file for Step 5B.

Output:

- write `quality-report.md` into the article bundle
- keep the report structure fixed
- do not improvise a different checklist per article

Output path:

- if the input is already `{runtime_root}/output/{client}/{date}-{slug}/article.md`, write the report beside it
- otherwise create a standard output bundle first, then write `article.md` and `quality-report.md` into that bundle

## Step 5A: Auto-Fix Scope

Auto-fix only handles shallow, deterministic edits.

Allowed:

- remove mechanical AI connectors and classroom phrasing
- replace generic tool names with already-mentioned concrete tools
- rewrite hypothetical examples into explicit “未亲测” disclosures when no first-hand scene exists
- surface likely over-symmetry or list-heavy pacing as warnings

Not allowed:

- invent first-hand scenes
- fabricate personal feelings
- introduce new data, cases, or claims
- rewrite the whole article structure without user intent

## Step 5B: Fixed Report Template

The report must always contain these parts in order:

1. frontmatter
2. `## 质检报告`
3. article metadata bullets
4. `L1 硬性规则`
5. `L2 风格一致性`
6. `L3 内容质量`
7. `L4 活人感`
8. `自动修复`
9. `待人工确认`
10. `总评`
11. `修复优先级`

## L1 硬性规则

Check:

- banned lexical patterns
- banned structural patterns
- hypothetical examples
- generic tool names
- WeChat hard constraints

Blocking rule:

- L1 failure can block Step 7 when the issue is a real publish failure, such as missing title, unsupported content, or invalid article structure
- stylistic L1 failures that have been auto-fixed do not block if the fixed article is already written back

## L2 风格一致性

Check:

- opening quality
- rhythm variation
- transition quality
- spoken-but-controlled voice
- shape consistency with `immersive_longform` or `structured_longform`

Judgment:

- `immersive_longform` should usually keep `0-2` H2 and rely on scene, turns, and callbacks
- `structured_longform` should keep `2-5` H2 and give each section a concrete move or conclusion

## L3 内容质量

Check:

- whether the main claim is supported
- whether the article offers “顺手掏出来”的具体 knowledge
- whether the strongest opposing view is acknowledged
- whether the piece lifts into culture, history, structure, or wider pattern when needed
- whether the archetype-specific elements are present

Archetype-specific checks:

- `investigation`: validation path and failed attempt
- `product_experience`: real usage moment and who should skip it
- `phenomenon_analysis`: scene -> mechanism -> lift
- `tool_share`: concrete steps and misuse boundary
- `methodology`: learning curve and failure point

## L4 活人感

Check:

- warmth
- uniqueness
- posture
- flow breaks

Do not block Step 7 for isolated L4 misses.
Instead:

- report them
- keep the workflow moving
- use them as future playbook material

## Raw Markdown Routing

If the user says:

- `仅排版`
- `仅发布`
- `不要改内容`

then skip Step 5 and go directly to Step 7.

For all other raw Markdown intake:

- run Step 5A
- run Step 5B
- then continue to Step 7

This route is still shallow editing only.
Do not silently re-outline or rewrite the article unless the user asked for deeper editing.
