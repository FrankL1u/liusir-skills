# Skill Maintenance

Treat this as a WeChat article workflow skill, not a generic content platform integration.

## Primary boundary

Keep the skill focused on:

- article drafting
- WeChat-safe formatting
- optional image generation
- draft publishing
- stats backfill
- edit-learning and playbook support

Do not reintroduce hard dependencies on external content or reference-material integrations in this phase.

## Validation workflow

After changing `SKILL.md`, `README.md`, `references/`, or toolkit source files:

1. Run `python3 scripts/validate_skill.py`
2. Run `cd toolkit && npm run build`

## Mutable data

Repo-local runtime data may live under:

- `clients/*/history.yaml`
- `clients/*/lessons/`
- `clients/*/corpus/`
- `clients/*/themes/`
- `output/`

## Gotchas discipline

Document only real failure modes:

- publish failures caused by WeChat IP policy
- documentation drift from current commands
- image generation assumptions that silently remove visuals
- edit-learning on mismatched draft/final files
