# Environment

Required runtime tools:

- `node`
- `npm`
- `python3`

Recommended local checks:

```bash
node --version
npm --version
python3 --version
```

Built JavaScript commands run from `toolkit/`.

Runtime data is resolved in this order:

1. `./.ls-wechat-article/`
2. `~/.liusir-skills/ls-wechat-article/`
3. legacy skill-local files as a read-only fallback
