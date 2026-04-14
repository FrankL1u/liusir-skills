# Error Handling

## General rule

Fail precisely. Do not hide missing tools behind vague network or parser errors.

## Video transcript fallback

1. Official subtitle
2. Remote ASR when configured
3. Rule-based cleanup
4. Optional LLM cleanup and optional translation

If remote ASR is not configured and no official subtitles exist:

- return a precise config instruction that points to `.ls-multi-collector/config.yaml`
- stop the transcript action

If the LLM path fails:

- keep the rule-cleaned transcript
- do not fail the whole transcript action

If translation is unavailable:

- keep the transcript action successful
- do not produce `translation.md`

## Missing tools

If a required command is missing:

- name the missing command
- point the user to `references/setup.md`
- stop that action

## Unsupported input

If the URL is not supported for the requested action:

- say exactly which action was requested
- say which platforms are supported
- stop without partial output
