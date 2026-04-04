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

<One paragraph: core value + why this approach is better>

## Usage

<What the user provides. Keep it minimal — they should not need to understand internals.>

## Workflow

### Input Recognition

<Describe how to recognize the input type or request pattern before proceeding.>

### Prerequisites

<Check required CLI / local tools / paths / config / input validity here.>

### Core Flow

<Describe the main processing flow here with concise runnable guidance.>

### Output Handling

<Describe how to format, save, or return the result.>

## Error Handling

**Skill-specific errors:**

| Error | User Message |
|-------|--------------|
| <specific error> | <user-friendly message> |

## References

- Publishing: [../../shared/PUBLISHING.md](../../shared/PUBLISHING.md)
- Other references: `references/...`

## Onboarding
## Usage
## Setup
## Skill Directory
## Execution Modes
## Critical Quality Rules
## Pipeline Overview
## Resilience: Never Stop on a Single-Step Failure
## Operations
## Gotchas — Common Failure Patterns
## Comparison
## References

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
