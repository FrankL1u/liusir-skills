# liusir-skills

Monorepo for Liusir skills, with two distribution paths:

- whole-repo install through a Claude-style marketplace plugin
- per-skill install through `npx skills add` and ClawHub

## Repository Layout

```text
.
├── .claude-plugin/
├── .github/workflows/
├── scripts/
├── shared/
└── skills/
```

## Install

### Whole repo

Register this repository as a marketplace, then install the `liusir-skills` plugin.

### Per skill

```bash
npx skills add <your-org>/liusir-skills --list
npx skills add <your-org>/liusir-skills --skill liusir-example
```

After publishing to ClawHub:

```bash
clawhub install liusir-example
```

## Add A Skill

1. Copy `skills/liusir-example/`
2. Rename the directory and the `name:` field in `SKILL.md`
3. Update `version:` and `description:`
4. Add the skill path to `.claude-plugin/marketplace.json`
5. Commit and push to `main`

## Publish

- CI auto-publishes changed skills on push to `main`
- manual fallback:

```bash
./scripts/publish-skill.sh liusir-example --version 0.1.0 --changelog "Initial release"
```

## Notes

- GitHub is the source of truth
- each skill should keep only agent-facing files inside its directory
- runtime output, caches, secrets, and virtualenvs must stay out of `skills/`
- `shared/` is repository-level guidance only; it is not packaged into individual skills
