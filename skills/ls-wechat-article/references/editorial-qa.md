# Editorial QA

Use this file for Step 4.5.

Step 4.5 is diagnostic first. It runs after article drafting and before visuals, preview, or publishing.

Output:

- write `quality-report.md` into the article bundle
- provide a concise repair plan to the user after QA
- keep the report structure fixed
- do not improvise a different checklist per article

Output path:

- if the input is already `{runtime_root}/output/{client}/{date}-{slug}/article.md`, write the report beside it
- otherwise create a standard output bundle first, then write `article.md` and `quality-report.md` into that bundle

## Optional Revision Scope

If the user explicitly asks for revision after Step 4.5, use `quality-report.md` as the edit brief. Default optional revision only handles shallow, deterministic edits.

Allowed:

- remove mechanical AI connectors and classroom phrasing
- replace generic tool names with already-mentioned concrete tools
- rewrite hypothetical examples into explicit “未亲测” disclosures when no first-hand scene exists
- surface likely over-symmetry or list-heavy pacing as warnings
- revise only the affected sections when Step 4.5 identifies deeper rewrite needs and the user asks for those fixes

Not allowed:

- invent first-hand scenes
- fabricate personal feelings
- introduce new data, cases, or claims
- rewrite the whole article structure without user intent
- change the selected `framework`, `article_archetype`, or `output_shape`

## Step 4.5: Fixed Report Template

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
12. `修复建议`

## Repair Plan Feedback

After writing `quality-report.md`, always report the repair plan to the user.

The feedback must include:

- top 3-5 fixes
- priority for each fix: `P1` / `P2` / `P3`
- whether the fix is `shallow edit` or `targeted rewrite`
- which section or paragraph is affected
- any user decision needed before optional revision

Do not ask for confirmation for obvious shallow fixes in auto mode.
Ask only when the repair would change the article angle, selected framework, factual scope, or first-person stance.

## L1 硬性规则

Check:

- title exists as the primary H1
- title creates a reader click reason instead of only summarizing the topic
- title uses at least one motivation type from `references/seo-rules.md`
- title promise is delivered by the body
- digest does not repeat the title
- banned lexical patterns
- banned structural patterns
- hypothetical examples
- generic tool names
- WeChat hard constraints

Blocking rule:

- L1 failure can block Step 6 when the issue is a real publish failure, such as missing title, unsupported content, or invalid article structure
- unsupported title promises should block publishing only when the mismatch would materially mislead readers; otherwise record a high-priority repair suggestion
- stylistic L1 failures do not block if they are recorded with clear repair suggestions and do not create a real publish failure

Title QA output must include:

- selected title
- title length
- detected motivation type: `观点鲜明` / `好奇疑问` / `认知反差` / `悬念缺口` / `痛点利益`
- core keyword position
- whether the body delivers the title promise
- whether the digest adds a separate hook
- suggested replacement title when the current title fails

## L2 风格一致性

Check:

- opening quality
- rhythm variation
- transition quality
- spoken-but-controlled voice
- shape consistency with `immersive_longform` or `structured_longform`

Judgment:

- `immersive_longform` should usually keep `0-2` H2 and rely on a strong opening, turns, and callbacks
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

Do not block Step 6 for isolated L4 misses.
Instead:

- report them
- keep the workflow moving
- use them as future playbook material

## Raw Markdown Routing

If the user says:

- `仅排版`
- `仅发布`
- `不要改内容`

then skip Step 4.5 and go directly to Step 6.

For all other raw Markdown intake:

- run Step 4.5
- then continue to Step 6

This route is still conservative by default.
Do not silently re-outline or rewrite the whole article unless the user asked for deeper editing.
