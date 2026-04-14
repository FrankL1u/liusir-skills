# Skill Maintenance

Treat this as a collector workflow skill, not as a service framework.

## Primary boundary

Keep the skill focused on:

- routing requests to collector actions
- writing local bundles
- transcript cleanup and fallback rules
- article capture into Markdown and JSON
- environment inspection

Do not reintroduce:

- HTTP API
- MCP server
- CLI compatibility layer from the old project
- SQLite or query-style history APIs

## Validation workflow

After changing `SKILL.md`, `README.md`, `references/`, `prompts/`, `config.example.yaml`, or toolkit source files:

1. `python3 scripts/validate_skill.py`
2. `cd toolkit && npm run build`

## Gotchas discipline

Document only real failure modes:

- missing `ffmpeg`
- missing `defuddle` or `xreach`
- missing remote config assumptions
- no LLM translation path when LLM is disabled
- documentation drift from actual toolkit commands
