# Environment

Use this file for shared runtime expectations across skills.

## Baseline runtime

Most skills in this repository assume the local machine has:

- `node`
- `npm`
- `python3`

Recommended quick checks:

```bash
node --version
npm --version
python3 --version
```

## Repo conventions

- Runtime configuration should live under `./.ls-wechat-article/` or `~/.liusir-skills/ls-wechat-article/`; keep `config.example.yaml` in the skill package as the copy source only
- Built JavaScript commands usually run from a skill's `toolkit/` directory
- Skill-local validation scripts usually live under `scripts/`

## Rule

Keep this file generic.
Skill-specific runtime requirements should stay in that skill's own references or README.
