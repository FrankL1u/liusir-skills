# Operations Guide

Use this file for setup, publishing support, analytics, and edit-learning workflows.

## First-run setup

1. Install toolkit dependencies with `cd toolkit && npm install && npm run build`
2. Install Python helpers with `pip install -r requirements.txt`
3. Create `./.ls-wechat-article/` or `~/.liusir-skills/ls-wechat-article/`
4. Copy `config.example.yaml` to `{runtime_root}/config.yaml`
5. Ask the user for WeChat credentials:
   - `wechat.appid`
   - `wechat.secret`
6. Ask about optional image provider keys:
   - `gemini`
   - `openai`
   - `doubao`
   - `qwen`
7. Add the current public IP to the WeChat API whitelist

Store the configuration once and do not ask again unless the configuration is missing or invalid.

## Client onboarding

When the user says:

- `create new client`
- `import articles`
- `build playbook`

the agent should treat this as a client corpus / writing-profile task, not a drafting task.

If `{runtime_root}/clients/{client}/` does not exist, proactively ask the user how they want to initialize it before continuing.

Recommended options:

1. Create a `demo`-style client and edit it later
2. Specify a new client name and provide basic profile information
3. Paste their own answer in free form

Minimum structure to create:

- `{runtime_root}/clients/{client}/style.yaml`
- `{runtime_root}/clients/{client}/history.yaml`
- `{runtime_root}/clients/{client}/playbook.md`
- `{runtime_root}/clients/{client}/corpus/`
- `{runtime_root}/clients/{client}/lessons/`
- `{runtime_root}/clients/{client}/themes/`

Use `references/style-template.md` as the source template for `style.yaml`.

## Corpus ingestion

`{runtime_root}/clients/{client}/corpus/` is a reference-article directory.
Use it to store:

- representative historical articles written in this client's style
- high-fit reference articles worth learning from
- structure notes or annotated reference drafts that should influence future writing

When the user asks to:

- `import articles`
- `feed corpus`
- `build playbook`
- `喂语料`

the agent should help place suitable Markdown articles into `{runtime_root}/clients/{client}/corpus/`.

If `corpus/` contains 20+ useful articles, run:

```bash
node dist/build-playbook.js --client demo
```

## Publishing support

- Preview locally first if custom themes or images were recently changed
- If `publish` fails with an IP error, refresh the public IP and update the whitelist
- If inline image upload fails, verify the files exist relative to the Markdown file

## Stats backfill

```bash
node dist/fetch-stats.js --client demo --days 7
```

This reads recent WeChat article metrics and updates `{runtime_root}/clients/{client}/history.yaml`.

## Edit-learning

```bash
node dist/learn-edits.js --client demo --draft draft.md --final final.md
node dist/learn-edits.js --client demo --summarize
```

Use this after manual editing to record what changed and surface recurring patterns.
Every 5 accumulated lesson files should trigger a playbook refresh workflow.

## Playbook refresh

```bash
node dist/build-playbook.js --client demo
```

This scans `{runtime_root}/clients/{client}/corpus/` and prints the statistics and analysis prompts needed to refresh `playbook.md`.
When enough `lessons/` have accumulated, the agent should also use `learn-edits --summarize` as an input to the playbook refresh process.
