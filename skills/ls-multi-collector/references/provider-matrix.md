# Provider Matrix

| Source | Action | Primary dependency | Notes |
|--------|--------|--------------------|-------|
| Douyin | download-video | share-page HTML parse, direct media fetch | parses `_ROUTER_DATA`, no official subtitle path |
| Douyin | transcript-video | share-page HTML parse, remote ASR | uses `play_addr` direct media URL |
| YouTube | download-video | `yt-dlp` | |
| YouTube | transcript-video | `youtube-transcript`, remote ASR | prefers official subtitle |
| WeChat | fetch-article | HTTP fetch, HTML parsing | direct content extraction |
| X | fetch-article | `xreach` | thread and tweet mode |
| Generic web | fetch-article | `defuddle` | Markdown-first |

## External services

- Remote ASR is optional
- LLM is optional
- Transcript flow does not use local Whisper

## Source metadata

For `download-video` and `transcript-video`, `metadata.json` should retain source fields when available:

- `sourceUrl`
- `platform`
- `title`
- `authorName`
- `publishedAt`
- `coverUrl`
