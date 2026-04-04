# Skill Development Template

Copy this template when creating a new skill. Replace all `<placeholders>`.

## Naming Rules

- Skill name: `ls-<feature>` or another clear kebab-case slug (e.g. `ls-wechat-article`)
- **Max 32 characters** after sanitization (hyphens → underscores, only `a-z0-9_`)
- Slash command examples should match the actual skill slug convention used by the repository
- Keep it short and searchable. The slug is your #1 SEO lever on ClawHub.
- New skills must be loaded after `gateway restart` — hot-reload is not supported.
- **Never ask users to paste API keys in chat** — keys appear in chat history. Guide users to set env vars themselves, agent only verifies.
- **Must declare `metadata.openclaw`** with `primaryEnv`, `requires.env`, `requires.anyBins` — otherwise OpenClaw Code Insight flags as suspicious ("metadata omits requirements"). See apify skill as reference.
- **`requires.env` only lists truly required vars** — optional/dev-only env vars must NOT be listed, or the scanner flags "unnecessary credential exposure".
- **Every skill must have `.clawhubignore`** — at minimum exclude `references/environment.md` (dev-only, contains preview env vars that trigger scanner flags).
- **Every SKILL.md must declare `version:` in frontmatter** — this is the single source of truth for ClawHub publishing. CI auto-publishes on merge to main. Skills without a version field are skipped. Use [semver](https://semver.org/).


## Language Rules

- **SKILL.md must be written entirely in English** — no Chinese, Japanese, or other non-English text in instructions or examples. (Multilingual trigger words in `description` are OK for search matching.)
- **Agent responses must always be in the user's language.** English in SKILL.md is only the source; the agent translates all user-facing messages at runtime.
- Error messages, status updates, prompts, and summaries — all must adapt to the user's input language.
- Example messages in SKILL.md should be written in English as templates. Add a note like: `(Adapt to user's language)` after each template.


## SKILL.md Skeleton

```markdown
---
name: ls-<name>
version: 1.0.0
description: |
  <Core feature in one sentence>. <Key differentiator>.
  <Batch/parallel capability if applicable>.
  Use when user wants to "<English trigger>", "<Chinese trigger>", "<Japanese>", "<Korean>".
triggers:
  - "<english trigger phrase 1>"
  - "<english trigger phrase 2>"
  - "<chinese trigger phrase>"
  - "<japanese trigger phrase>"
metadata:
  openclaw:
    homepage: https://github.com/FrankL1u/liusir-skills
    requires:
      anyBins:
        - <bin-1>
        - <bin-2>
---

# <Skill Title>

<One paragraph: core value, outcome, and why this workflow is better than an ad-hoc prompt. Point the agent to SKILL.md for routing rules, quality bars, resilience rules, and execution boundaries.>

## Onboarding

<Optional but recommended for installable user-facing skills. Define the exact first message to show immediately after install, when it must appear, and whether it should be translated to the user's language. Include 2-4 "Try it now" examples and the minimum viable setup path if the skill needs local tools or credentials.>

## Usage

<Describe the main user entry patterns. Focus on what the user can provide, not internal implementation. Good patterns include: starting from a topic, starting from an existing file or URL, starting from a specific step, or running a maintenance / post-processing task. Add 3-6 concrete examples.>

## Setup

<List first-run requirements, install commands, required config files, required credentials, external service prerequisites, and what still works in degraded mode when setup is incomplete. Keep this operational and runnable.>

## Skill Directory

<Tell the agent which files or folders to read on demand and why. Prefer a table with `Path` and `Purpose`. Include `references/`, `scripts/`, generated artifacts, client/project data folders, and any runtime config files. Explicitly say not to load everything upfront.>

## Execution Modes

<Define how the skill routes work under different modes. At minimum, explain the default automatic mode and any explicit pause / routing mode such as `--step`, `--mode`, or phase-specific entry. State what should proceed automatically and what requires a user decision.>

## Critical Quality Rules

<Write the non-negotiable rules as numbered items. These should be the must-follow quality bars or policy rules the agent cannot safely infer from references alone. Examples: read a required guide before drafting, respect explicit routing, ask at specific decision boundaries, use only approved providers, publish or save in the required destination, or always rebuild generated artifacts after source edits.>

## Pipeline Overview

<Provide the end-to-end sequence as a concise ordered list. This should explain the major stages of the workflow from input recognition through final output and any maintenance or learning loop. Keep it high signal and easy to scan.>

## Resilience: Never Stop on a Single-Step Failure

<Describe fallback behavior. The core rule is that a local failure should not terminate the entire workflow if a usable fallback exists. State when to retry, when to fall back, when to continue in degraded mode, and the narrow conditions that justify stopping entirely.>

## Operations

<Describe non-primary but important operational workflows such as first-run setup, onboarding a new client or project, maintenance, analytics backfill, imports, migrations, history refresh, or validation. If the details are long, summarize here and point to `references/operations.md`.>

## Gotchas — Common Failure Patterns

<List the mistakes or recurring breakpoints specific to this skill. Focus on failures caused by config drift, missing rebuilds, unsupported platform behavior, stale artifacts, path mismatches, incorrect assumptions about automation, or misuse of generated data. Explain what to check first.>

## Comparison

<Explain when this skill should be preferred over a generic prompt, adjacent skill, or manual workflow. State what extra reliability, repeatability, memory, tooling, or automation this skill adds. A short bullet list or compact comparison table works well.>

## References

- Publishing: [../../shared/PUBLISHING.md](../../shared/PUBLISHING.md)
- Main execution detail: `references/...`
- Operations detail: `references/operations.md`
- Quality guide: `references/...`
- CLI / script reference: `references/...`

```

## Writing Descriptions

**MUST write in third person**:

```yaml
# Good
description: Generates Xiaohongshu infographic series from content. Use when user asks for "小红书图片", "XHS images".

# Bad
description: I can help you create Xiaohongshu images
```

## Steps

1. Create `skills/ls-<name>/SKILL.md` with YAML front matter
2. Add TypeScript in `skills/ls-<name>/scripts/` (if applicable)
3. Add prompt templates in `skills/ls-<name>/prompts/` if needed
4. Register the skill in `.claude-plugin/marketplace.json` under the `liusir-skills` plugin entry
5. Add Script Directory section to SKILL.md if skill has scripts
6. Add openclaw metadata to frontmatter


## Performance Rules

**Never let agents parse JSON manually** (grep/read field-by-field is extremely slow — each tool call is an LLM round trip).

For any step that processes a JSON response, provide a one-shot pipe command:

```bash
<command producing json> | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(d['title'])
print(d['count'])
"
```

Principle: **one tool call = parse → process → output**. Never split into multiple steps.

## Critical Behavior Placement

**Never put must-do behaviors only in `references/*.md`.** Agents often skip referenced files. If a behavior is critical to user experience, write it directly in the SKILL.md workflow step with `⚠️ MANDATORY` prefix. Referenced docs are for supplementary details only.

Examples of critical behaviors that must be inline:
- Send intermediate results to the user immediately (don't wait for full completion)
- Use subagent/background for any polling or long-running step
- Send files as attachments, not pasted inline

## Polling Pattern

For APIs with async tasks, use this pattern:

```bash
# Polling template
for i in $(seq 1 20); do
  RESULT=$(<cli> <subcommand> '<params>')
  STATUS=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('<status_field>','pending'))")
  [ "$STATUS" = "completed" ] && break
  sleep 3
done
```

Or describe polling rules in SKILL.md for the agent to implement, but always specify:
- Interval (recommended: 3 seconds)
- Timeout (recommended: 60 seconds)
- Completion condition
- User message on timeout

## Batch Mode

If the skill naturally supports multiple inputs:
1. Mention batch capability in the first line of `description`
2. Show batch usage example in the Usage section
3. Define a limit (recommended: 5)
4. Design flow: create all first, then poll all together (not sequential wait)
5. Provide a summary table at the end

## ClawHub Publishing Optimization

Before publishing, review the checklist in `memory/clawhub-seo.md` (ranking formula / quality gate / keyword strategy).

Key points:
- slug must contain target search keywords (`youtube-transcript` not `yt-ts`)
- First 160 chars of description = search card text. Pack core feature + differentiator
- Include multilingual trigger words in description
- Body ≥ 250 chars, ≥ 80 words, ≥ 2 headings, ≥ 3 bullets
- Add comparison table (enriches vector semantic coverage)

## Testing

1. Verify happy path + edge cases (e.g., missing data, invalid input)
2. Confirm one-shot commands execute correctly
3. Verify skill discovery: `npx skills add . --list`

## Publishing

```bash
./scripts/publish-skill.sh ls-<name> --version 1.0.0 --changelog "Initial release"
```

See `shared/PUBLISHING.md` for the full workflow.
