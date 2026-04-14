# Setup

Prepare all system components and scraping tools before using the skill. The collection workflow checks for them at runtime, but it does not install them during a run.

Douyin video handling follows the old project path: it parses the share page HTML directly and extracts `play_addr` from `window._ROUTER_DATA`. It does not require a `yt-dlp` cookie export for metadata resolution.

## Required system components

- `node`
- `npm`
- `uv`
- `ffmpeg`
- `yt-dlp`

Recommended macOS setup:

```bash
brew install node uv ffmpeg yt-dlp
```

## Required scraping tools

- `defuddle`
- `xreach`
- `camoufox runtime`

Example installation flow:

```bash
npm install -g defuddle xreach-cli
python3 -m pip install camoufox
python3 -m camoufox fetch
```

If you already have another Python environment manager, keep the end result the same: `python3 -c "import camoufox"` should work.

## Toolkit setup

```bash
cd toolkit
npm install
npm run build
```

## Runtime config

```bash
mkdir -p .ls-multi-collector
cp config.example.yaml .ls-multi-collector/config.yaml
```

The config file is only for external service settings such as remote ASR and LLM. Put service keys directly in this file. It does not contain runtime paths or workflow feature flags.

## Optional remote services

Remote ASR and LLM are optional:

- If remote ASR is configured, transcript flow tries it after official subtitles
- If remote ASR is not configured and no official subtitles exist, transcript flow stops with a config instruction
- If LLM is configured, transcript flow can do secondary cleanup and optional translation
- If LLM is not configured, rule-based cleanup still runs
