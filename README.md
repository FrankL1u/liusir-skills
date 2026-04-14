# LIUSIR Skills

AI agent skills for source collection, content workflows, and publishing automation.

This repository currently includes three workflow skills:

- Local media and article collection workflow
- WeChat Official Account article workflow
- Xiaohongshu note workflow

## Available Skills

| Skill | Description |
|-------|-------------|
| [ls-multi-collector](./skills/ls-multi-collector) | Collect Douyin, YouTube, WeChat, X, and generic web content into local bundles with video download, transcript, and article-fetch workflows |
| [ls-wechat-article](./skills/ls-wechat-article) | Write and publish WeChat Official Account articles end-to-end — topic intake, drafting, SEO polish, cover and inline images, theme preview, draft publish, stats backfill, and learning workflows |
| [ls-xhs-note](./skills/ls-xhs-note) | Create Xiaohongshu note assets end-to-end — topic intake, source article drafting, native note writing, visual planning, and image generation |

## Quick Install

### Install a specific skill

```bash
npx skills add FrankL1u/liusir-skills --skill ls-multi-collector
npx skills add FrankL1u/liusir-skills --skill ls-wechat-article
npx skills add FrankL1u/liusir-skills --skill ls-xhs-note
```

### See available skills

```bash
npx skills add FrankL1u/liusir-skills --list
```

### Install from a marketplace plugin

This repository also includes a plugin-style distribution path through `.claude-plugin/`.

## Prerequisites

Some skills may require additional local setup.

Common prerequisites across the workflow skills:

- Node.js >= 18
- Python >= 3.9
- `ls-multi-collector` also requires `uv`, `ffmpeg`, `yt-dlp`, `defuddle`, `xreach`, and `camoufox`
- Optional image provider keys for AI image generation

Skill-specific notes:

- `ls-multi-collector`: collects source material into local bundles; remote ASR and LLM are optional for transcript enhancement
- `ls-wechat-article`: requires WeChat Official Account API credentials for publishing, and can optionally use TrendRadar MCP for topic signals
- `ls-xhs-note`: does not publish directly; it can optionally use TrendRadar MCP for topic signals and image providers for Step 5 generation

See the setup guides in [skills/ls-multi-collector/README.md](./skills/ls-multi-collector/README.md), [skills/ls-wechat-article/README.md](./skills/ls-wechat-article/README.md), and [skills/ls-xhs-note/README.md](./skills/ls-xhs-note/README.md).

## Works With

These skills are designed for AI agents and coding tools that support skill-style packaging:

- OpenClaw
- Claude Code
- Cursor
- Codex
- Gemini CLI
- Windsurf
- Kilo
- OpenCode
- Goose
- Roo
- Any tool supporting `npx skills add`

## Repository Layout

```text
.
├── .claude-plugin/        # Plugin-style distribution metadata
├── .github/workflows/     # CI and release workflows
├── scripts/               # Repository-level maintenance scripts
├── shared/                # Shared templates and publishing docs
└── skills/                # Installable skills
```

## Contributing

### Add a new skill

1. Create `skills/<skill-name>/`
2. Add a `SKILL.md` with `name`, `version`, `description`, triggers, and usage rules
3. Add skill-specific references, scripts, and runtime files inside that skill directory
4. Update any plugin or marketplace metadata if needed
5. Open a pull request

### Update an existing skill

1. Make your changes
2. Bump the `version:` in `SKILL.md`
3. Update skill-specific docs if behavior changed
4. Open a pull request

## Publish

- CI can publish changed skills through the repository release flow
- Repository maintenance scripts live under `scripts/`

## Notes

- Each skill should keep its own agent-facing files inside its skill directory
- Runtime output, caches, secrets, and virtualenvs should stay out of `skills/`
- `shared/` is repository-level guidance and publishing support, not per-skill runtime output

## License

MIT
