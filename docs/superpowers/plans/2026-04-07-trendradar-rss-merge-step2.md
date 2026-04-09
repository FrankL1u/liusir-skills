# TrendRadar RSS Merge Step2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update Step 2 so TrendRadar topic intake merges recent news and RSS items from the last 1 day into one normalized JSON candidate pool.

**Architecture:** Keep the existing `fetch_trendradar_hotspots.py` entrypoint and output shape so Step 3 continues to consume a single `{ timestamp, sources, count, items }` payload. Replace the latest-batch news call with a 1-day date-range news query, add a parallel RSS query, normalize both sources into one shared item schema, then sort and deduplicate inside the script.

**Tech Stack:** Python 3, requests, YAML config, Markdown docs

---

### Task 1: Extend TrendRadar Step 2 Fetcher

**Files:**
- Modify: `skills/ls-wechat-article/scripts/fetch_trendradar_hotspots.py`
- Test: manual script execution against mocked payloads or local review of normalized output paths

- [ ] **Step 1: Write the failing behavior checklist**

```python
# Desired behavior to verify while editing fetch_trendradar_hotspots.py:
# 1. Default news source uses get_news_by_date instead of get_latest_news.
# 2. Default RSS source uses get_latest_rss(days=1).
# 3. Default output keeps {timestamp, sources, count, items}.
# 4. Each item includes:
#    title, hotness, source, platform_name, url, timestamp, rank, content_type
# 5. News items set content_type="news"; RSS items set content_type="rss".
# 6. Combined items are deduplicated by normalized title and sorted by score.
```

- [ ] **Step 2: Review current implementation before editing**

Run: `nl -ba skills/ls-wechat-article/scripts/fetch_trendradar_hotspots.py | sed -n '1,260p'`
Expected: current script shows `search_news` for query mode and `get_latest_news` for default mode.

- [ ] **Step 3: Update the script to fetch and merge 1-day news + RSS**

```python
def normalize_news_item(item):
    title = item.get("title", "").strip()
    return {
        "title": title,
        "hotness": item.get("count", 0) or item.get("rank", 0) or 0,
        "source": item.get("platform", "trendradar"),
        "platform_name": item.get("platform_name", ""),
        "url": item.get("url", ""),
        "timestamp": item.get("timestamp") or item.get("date", ""),
        "rank": item.get("rank"),
        "content_type": "news",
    }


def normalize_rss_item(item):
    title = item.get("title", "").strip()
    return {
        "title": title,
        "hotness": 0,
        "source": item.get("feed_id", "rss"),
        "platform_name": item.get("feed_title", item.get("source", "RSS")),
        "url": item.get("url", ""),
        "timestamp": item.get("published") or item.get("date", ""),
        "rank": None,
        "content_type": "rss",
    }


def score_item(item):
    score = 0
    if item["content_type"] == "news":
        score += min(int(item.get("hotness", 0) or 0), 1_000_000)
        if item.get("rank"):
            score += max(0, 1000 - int(item["rank"]) * 10)
    else:
        score += 500
    if item.get("timestamp"):
        score += 100
    return score
```

- [ ] **Step 4: Keep query mode unchanged and change default mode inputs**

```python
if args.query:
    raw = client.call_tool(
        "search_news",
        {
            "query": args.query,
            "limit": args.limit,
            "include_url": args.include_url,
            "sort_by": "relevance",
            "include_rss": True,
            "rss_limit": args.limit,
        },
    )
else:
    news_raw = client.call_tool(
        "get_news_by_date",
        {
            "date_range": "最近1天",
            "limit": args.limit,
            "include_url": args.include_url,
        },
    )
    rss_raw = client.call_tool(
        "get_latest_rss",
        {
            "days": 1,
            "limit": args.limit,
            "include_summary": False,
        },
    )
```

- [ ] **Step 5: Normalize the merged payload and verify no schema break**

Run: `python3 -m py_compile skills/ls-wechat-article/scripts/fetch_trendradar_hotspots.py`
Expected: no output, exit code 0.

- [ ] **Step 6: Commit**

```bash
git add skills/ls-wechat-article/scripts/fetch_trendradar_hotspots.py
git commit -m "feat: merge TrendRadar news and rss in step2"
```

### Task 2: Document the New Step 2 Behavior

**Files:**
- Modify: `skills/ls-wechat-article/references/pipeline.md`
- Modify: `skills/ls-wechat-article/README.md`
- Modify: `skills/ls-wechat-article/README_ZH.md`

- [ ] **Step 1: Add the new source behavior to pipeline docs**

```md
- When TrendRadar is enabled, `scripts/fetch_trendradar_hotspots.py` should merge:
  - recent news from the last 1 day
  - RSS items from the last 1 day
- Treat the merged output as one signal pool for Step 3
- The script still outputs normalized JSON, not topic keywords
```

- [ ] **Step 2: Update README to explain the merged TrendRadar intake**

```md
When enabled, Step 2 uses `scripts/fetch_trendradar_hotspots.py` to merge:
- TrendRadar news from the last 1 day
- TrendRadar RSS items from the last 1 day

The script emits one normalized JSON payload for downstream topic selection.
```

- [ ] **Step 3: Mirror the same explanation in the Chinese README**

```md
启用后，Step 2 会通过 `scripts/fetch_trendradar_hotspots.py` 合并：
- 最近 1 天的新闻
- 最近 1 天的 RSS 订阅内容

输出仍然是给下游选题阶段使用的统一 JSON，而不是关键词列表。
```

- [ ] **Step 4: Review docs for consistency**

Run: `rg -n "get_latest_news|最近 1 天|RSS|normalized JSON|统一 JSON" skills/ls-wechat-article/README.md skills/ls-wechat-article/README_ZH.md skills/ls-wechat-article/references/pipeline.md`
Expected: docs mention 1-day news + RSS merge and no longer describe default intake as latest batch only.

- [ ] **Step 5: Commit**

```bash
git add skills/ls-wechat-article/references/pipeline.md skills/ls-wechat-article/README.md skills/ls-wechat-article/README_ZH.md
git commit -m "docs: describe merged TrendRadar intake"
```

### Task 3: Verify End-to-End Compatibility

**Files:**
- Modify: `skills/ls-wechat-article/scripts/fetch_trendradar_hotspots.py` if verification exposes issues

- [ ] **Step 1: Inspect the final diff**

Run: `git diff -- skills/ls-wechat-article/scripts/fetch_trendradar_hotspots.py skills/ls-wechat-article/references/pipeline.md skills/ls-wechat-article/README.md skills/ls-wechat-article/README_ZH.md`
Expected: only the planned Step 2 news/RSS merge behavior and documentation updates are present.

- [ ] **Step 2: Run script syntax verification again**

Run: `python3 -m py_compile skills/ls-wechat-article/scripts/fetch_trendradar_hotspots.py`
Expected: no output, exit code 0.

- [ ] **Step 3: If TrendRadar is available locally, run a smoke test**

Run: `python3 skills/ls-wechat-article/scripts/fetch_trendradar_hotspots.py --limit 5 --include-url`
Expected: JSON output with `sources`, `count`, and mixed `content_type` values when both news and RSS are available.

- [ ] **Step 4: If TrendRadar is unavailable, document the skipped smoke test in the final handoff**

```text
Skipped live TrendRadar smoke test because local MCP service was not enabled/reachable.
Static verification completed with py_compile and diff review.
```

- [ ] **Step 5: Commit**

```bash
git add skills/ls-wechat-article/scripts/fetch_trendradar_hotspots.py skills/ls-wechat-article/references/pipeline.md skills/ls-wechat-article/README.md skills/ls-wechat-article/README_ZH.md
git commit -m "chore: verify merged TrendRadar step2 flow"
```
