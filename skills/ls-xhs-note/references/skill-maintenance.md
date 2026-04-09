# Skill Maintenance

## Consistency rules

- keep `SKILL.md` concise and move operational detail into `references/`
- every command documented in code must also appear in `references/cli-reference.md`
- every workflow step named in `SKILL.md` must match `references/pipeline.md`
- generated artifact names should stay stable across docs and commands

## Naming rules

Preferred terms:

- `note`
- `series`
- `asset package`
- `bundle`
- `prompt plan`
- `playbook`

Avoid mixing multiple names for the same artifact.

## Update rules

When a command changes:

1. update `references/cli-reference.md`
2. update `references/pipeline.md` if the step behavior changed
3. update `scripts/validate_skill.py` if validation rules depend on the command

When the output contract changes:

1. update `references/cli-reference.md`
2. update `references/operations.md`
3. update `references/workflows/prompt-assembly.md` if series planning changed

## Validation checklist

- docs mention only commands that exist
- docs mention only artifacts that the workflow produces
- bundle layout is consistent across all references
- no external skill path or external document dependency appears in the references
- no vague指代 or branded wording appears in the copy

## Release gate

Before calling the skill documentation complete:

- run the validation script
- build toolkit output
- spot-check one topic-driven flow
- spot-check one long-form derivation flow
- spot-check one prompt-only image fallback flow
