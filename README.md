# LIUSIR Skills

AI agent skills for content workflows and publishing automation.

This repository currently focuses on WeChat Official Account writing: drafting, formatting, theme preview, optional image generation, draft publishing, analytics backfill, and edit-learning workflows.

## Available Skills

| Skill | Description |
|-------|-------------|
| [ls-wechat-article](./skills/ls-wechat-article) | Write and publish WeChat Official Account articles end-to-end — topic intake, drafting, SEO polish, cover and inline images, theme preview, draft publish, stats backfill, and learning workflows |

## Quick Install

### Install a specific skill

```bash
npx skills add <your-org>/LS-SKILLS --skill ls-wechat-article
```

### See available skills

```bash
npx skills add <your-org>/LS-SKILLS --list
```

### Install from a marketplace plugin

This repository also includes a plugin-style distribution path through `.claude-plugin/`.

## Prerequisites

Some skills may require additional local setup. For `ls-wechat-article`, the common prerequisites are:

- Node.js >= 18
- Python >= 3.9
- WeChat Official Account API credentials for publishing
- Optional image provider keys for AI image generation
- Optional TrendRadar MCP service for Step 2 topic signals

See the skill-specific setup guide in [skills/ls-wechat-article/README.md](./skills/ls-wechat-article/README.md).

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
