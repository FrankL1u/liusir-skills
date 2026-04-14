# Pipeline

## Step 1: Normalize input

- Trim and normalize share text
- Extract the primary URL
- If there is no supported URL, fail early with a precise message

## Step 2: Detect source type

- `douyin / youtube` -> video source
- `mp.weixin.qq.com` -> WeChat article
- `x.com / twitter.com` -> X content
- generic URL -> web article

## Step 3: Route to action

Route by user intent first:

- user asks to download -> `download-video`
- user asks for transcript / subtitles -> `transcript-video`
- user asks to fetch article / thread / post -> `fetch-article`

If the user does not name an action:

- `douyin / youtube` video links or share text -> `transcript-video`
- `mp.weixin.qq.com`, `x.com / twitter.com`, generic web links -> `fetch-article`

If the user explicitly asks for `fetch-article` on a video link, stop with a precise unsupported-action error and tell them to use `transcript-video` or `download-video`.

## Step 4: Execute action

### download-video

- Resolve video metadata
- Download media with `yt-dlp`
- Keep source metadata in `metadata.json`
- Write `video.*`, `metadata.json`, `report.md`, `manifest.json`

### transcript-video

- Resolve video metadata
- Try official subtitles
- If unavailable, try remote ASR when configured
- If unavailable and no remote ASR is configured, stop with a config instruction
- Run rule-based cleanup
- If LLM is configured, run LLM cleanup and optional translation
- Write `metadata.json`, `raw.json`, `transcript.md`, `report.md`, optional `translation.md`, `manifest.json`

### fetch-article

- Route to `web`, `wechat`, `x`, or `video_meta`
- Fetch or derive Markdown
- Write `article.md`, `metadata.json`

## Step 5: Return bundle result

Return the bundle directory and key artifact paths. Do not reintroduce `get`, `find`, `status`, `poll`, or `resume`.
