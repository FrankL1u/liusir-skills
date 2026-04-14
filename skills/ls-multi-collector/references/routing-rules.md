# Routing Rules

## Input parsing

- Always prefer the first supported URL found in share text
- Ignore unrelated URLs if a supported collector URL is also present

## Intent routing

- `下载`, `download`, `保存视频` -> `download-video`
- `转录`, `逐字稿`, `字幕`, `transcript`, `subtitle` -> `transcript-video`
- `抓取文章`, `fetch article`, `抓公众号`, `抓 thread`, `抓网页正文` -> `fetch-article`
- If the user only provides a supported video link or share text with no action words, default to `transcript-video`

## Platform routing

- Douyin -> video only
- YouTube -> default `transcript-video`
- WeChat -> article
- X -> article-like social post
- Generic web -> article

## Explicit overrides

If the user explicitly names an action, respect it unless the source is unsupported for that action.

For supported video platforms:

- explicit `download-video` -> download
- explicit `transcript-video` -> transcript
- explicit `fetch-article` -> unsupported, tell the user to use `transcript-video` or `download-video`
