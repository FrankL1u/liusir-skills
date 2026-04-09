---
name: ls-xhs-note
version: 1.0.0
description: |
  Use when the user wants a complete Xiaohongshu note workflow that can
  start from a topic and turn it into a source article, a native note, and
  image assets, or continue from an existing note draft. Supports framework
  selection, model-native note drafting, and image generation.
triggers:
  - "小红书"
  - "小红书笔记"
  - "图文笔记"
  - "小红书图文"
  - "小红书封面"
  - "小红书配图"
  - "小红书标题"
  - "小红书素材包"
  - "写小红书"
  - "XHS"
  - "xhs"
  - "xiaohongshu"
  - "RedNote"
  - "rednote"
  - "XHS note"
  - "XHS assets"
  - "Xiaohongshu note"
  - "write Xiaohongshu"
  - "export XHS package"
platforms:
  - openclaw
  - claude-code
  - cursor
  - codex
  - gemini-cli
  - windsurf
  - kilo
  - opencode
  - goose
  - roo
metadata:
  openclaw:
    homepage: https://github.com/example/skill-repo
    emoji: "📕"
    primaryEnv: []
    requires:
      env: []
      anyBins: ["node", "npm", "python3"]
allowed-tools:
  - Bash(node dist/cli.js *)
  - Bash(node dist/image-gen.js *)
  - Bash(node dist/learn-edits.js *)
  - Bash(node dist/build-playbook.js *)
  - Bash(python3 scripts/*)
  - Bash(npm install)
  - Bash(npm run build)
---

# XHS Note Workflow

Create Xiaohongshu note assets from a topic or an existing draft.  
Workflow rules live in `references/`. Repeatable execution lives in `toolkit/`. Content decisions belong to the model and the reference files; the CLI stays on the execution side.

## Setup

1. Run `cd toolkit && npm install && npm run build`.
2. Run `pip install -r requirements.txt`.
3. Copy `config.example.yaml` to `config.yaml`.
4. Add image provider keys only if automatic image generation is needed.
5. Run `python3 scripts/validate_skill.py` after setup or structural edits.

## Skill Directory

| Path | Purpose |
|------|---------|
| `references/pipeline.md` | End-to-end workflow and routing |
| `references/frameworks.md` | Primary framework definitions |
| `references/drafting-skeletons.md` | Framework-specific draft body shapes |
| `references/writing-guide.md` | Writing quality rules |
| `references/title-rules.md` | Title, hook, tag, CTA, and first-screen copy rules |
| `references/xhs-constraints.md` | Platform constraints |
| `references/visual-prompts.md` | Visual planning rules |
| `references/style-selection.md` | Preset recommendation matrix |
| `references/style-presets.md` | Primary preset system and override mapping |
| `references/workflows/prompt-assembly.md` | Series prompt assembly contract |
| `references/cli-reference.md` | Command reference |
| `references/operations.md` | Setup, onboarding, export, and maintenance notes |
| `references/style-template.md` | Client configuration template |
| `references/skill-maintenance.md` | Documentation and validation rules |
| `clients/{client}/style.yaml` | Client profile and visual defaults |
| `clients/{client}/history.yaml` | Export history |
| `clients/{client}/playbook.md` | Optional local writing notes |
| `toolkit/dist/*.js` | Built CLI entrypoints |
| `scripts/*.py` | Intake and validation helpers |

## Pipeline Overview

| Step | What happens |
|------|---------------|
| 1 | Load client config and route the request |
| 2 | Gather or accept a topic angle |
| 3 | Choose the angle and framework |
| 4 | Draft the note and polish posting copy |
| 5 | Generate images |
| 6 | Keep a placeholder post-generation step for later adjustment |

## Workflow Layers

The skill currently has two layers:

- main workflow steps
- standalone maintenance tasks

Main workflow steps:

1. load client configuration
2. topic intake
3. angle selection and framework choice
4. draft the note and polish posting copy
5. generate images
6. keep a placeholder post-generation step for later adjustment

Standalone maintenance tasks:

- client onboarding
- history maintenance

Supported entry modes:

- topic-driven drafting
- existing draft polishing and export
- explicit `--step` routing

## Critical Quality Rules

1. Read `references/writing-guide.md` before drafting.
2. Keep one dominant angle per note.
3. Write native note copy with model reasoning, not with programmatic skeleton generation as the primary path.
4. Respect `clients/{client}/style.yaml` tone and blacklist fields.
5. Keep the first screen fast to scan.
6. Use `references/frameworks.md`, `references/drafting-skeletons.md`, `references/writing-guide.md`, and `references/title-rules.md` together in Step 4.
7. Treat Step 5 as an image-generation workflow, not a dedicated first-page shortcut.
8. If image generation fails, keep prompt-only output and continue.
9. Use `preset` as the primary visual decision; open `style` and `layout` only as overrides.
10. Keep command behavior aligned with `references/cli-reference.md`.
11. Do not move title, hashtag, slicing, or prompt decisions into heuristic CLI code.

## Resilience: Never Stop on a Single-Step Failure

- If topic signals fail, continue with a direct topic.
- If client configuration is missing, initialize the minimum client structure and continue.
- If image generation fails, keep prompt files and generation diagnostics.
- Stop entirely only when required input is missing and no safe fallback exists.

## Operations

Use `references/operations.md` for:

- first-run setup
- client onboarding
- export support
- maintenance support

## Gotchas

- A note that preserves every branch of a long-form source will lose speed and clarity.
- Title quality depends on the actual angle, not on louder adjectives.
- Dense visual layouts fail quickly when the body copy is not already compact.
- The workflow drifts quickly if title, hashtag, slicing, or prompt choices move into heuristic code.

## Comparison

| Workflow | Best use | Limitation |
|----------|----------|------------|
| Full note workflow | Repeatable drafting and image generation | Later post-generation handling is still a placeholder |
| Raw prompt only | Quick idea exploration | No stable history or image plan |
| Manual packaging | Maximum manual control | Slow and inconsistent |

## References

- Main workflow: `references/pipeline.md`
- Commands: `references/cli-reference.md`
- Writing: `references/writing-guide.md`
- Visual planning: `references/visual-prompts.md`
- Maintenance: `references/skill-maintenance.md`
