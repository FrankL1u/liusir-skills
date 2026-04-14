# Output Contract

All results are written under:

- `output/`
- `.ls-multi-collector/temp/`
- `.ls-multi-collector/logs/`

## Bundle naming

Bundle directories use:

```text
<timestamp>-<action>-<platform>-<slug>/
```

## download-video bundle

Required files:

- `video.*`
- `metadata.json`
- `report.md`
- `manifest.json`

## transcript-video bundle

Required files:

- `metadata.json`
- `raw.json`
- `transcript.md`
- `report.md`
- `manifest.json`

Optional files:

- `translation.md`

`metadata.json` for video bundles should preserve source information when available, including:

- `sourceUrl`
- `platform`
- `title`
- `authorName`
- `publishedAt`
- `coverUrl`

## fetch-article bundle

Required files:

- `article.md`
- `metadata.json`

## Manifest contract

Each manifest must include:

- `action`
- `platform`
- `sourceUrl`
- `title`
- `artifacts`
