# Operations Guide

Use this file for setup, image execution support, and maintenance routines.

## First-run setup

1. install toolkit dependencies with `cd toolkit && npm install && npm run build`
2. install Python helpers with `pip install -r requirements.txt`
3. copy `config.example.yaml` to `config.yaml`
4. add image provider keys if automatic image generation is needed

## Client onboarding

Create the minimum client structure when `clients/{client}/` does not exist.

Required paths:

- `clients/{client}/style.yaml`
- `clients/{client}/history.yaml`
- `clients/{client}/styles/`

Compatibility paths kept for internal maintenance:

- `clients/{client}/playbook.md`
- `clients/{client}/corpus/`
- `clients/{client}/lessons/`

Use `references/style-template.md` as the starting shape for `style.yaml`.

## Image execution support

When the bundle is missing Step 5 artifacts:

- verify the bundle path
- verify `series-plan.json`
- verify `series-manifest.json`
- verify prompt files exist even if images failed

Recommended checks after preset or layout changes:

- preview locally
- confirm `series-outline.md` still matches the note angle
- confirm prompt files match the intended preset and page structure

## Failure handling

- if image generation fails, keep prompt-only output and continue
- if bundle writing fails, return preview output and diagnostics
- if client configuration is missing, initialize the minimum structure before drafting
