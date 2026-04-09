#!/usr/bin/env python3
"""
Fetch latest hotspots from TrendRadar MCP server.

Outputs JSON compatible with fetch_hotspots.py so Step 2 can treat both
sources as peer signal providers.

Usage:
    python3 fetch_trendradar_hotspots.py --limit 30
    python3 fetch_trendradar_hotspots.py --query "AI Coding" --limit 20
"""

import argparse
import json
import logging
from datetime import datetime
from pathlib import Path

import requests
import yaml


logger = logging.getLogger(__name__)

DEFAULT_BASE_URL = "http://127.0.0.1:3333/mcp"
DEFAULT_TIMEOUT = 30
DEFAULT_ACCEPT = "application/json, text/event-stream"
DEFAULT_WINDOW_EXPRESSION = "最近1天"
ROOT = Path(__file__).resolve().parents[1]
SKILL_KEY = "ls-wechat-article"


def runtime_roots():
    project_root = Path.cwd() / f".{SKILL_KEY}"
    user_root = Path.home() / ".liusir-skills" / SKILL_KEY
    legacy_root = ROOT
    return [project_root, user_root, legacy_root]


def load_config():
    for name in ["config.yaml", "config.example.yaml"]:
        for root in runtime_roots():
            path = root / name
            if path.exists():
                with path.open("r", encoding="utf-8") as f:
                    return yaml.safe_load(f) or {}
    return {}


def get_trendradar_config():
    raw = (load_config().get("trendradar") or {})
    return {
        "enabled": bool(raw.get("enabled", False)),
        "base_url": raw.get("base_url") or DEFAULT_BASE_URL,
        "timeout": int(raw.get("timeout_ms", DEFAULT_TIMEOUT * 1000)) / 1000.0,
    }


class TrendRadarSession:
    def __init__(self, base_url, timeout):
        self.base_url = base_url
        self.timeout = timeout
        self.session_id = None

    def initialize(self):
        response = requests.post(
            self.base_url,
            headers={"Accept": DEFAULT_ACCEPT},
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "method": "initialize",
                "params": {
                    "protocolVersion": "2025-03-26",
                    "capabilities": {},
                    "clientInfo": {
                        "name": "ls-wechat-article-step2",
                        "version": "1.0.0",
                    },
                },
            },
            timeout=self.timeout,
        )
        response.raise_for_status()
        self.session_id = response.headers.get("mcp-session-id")
        if not self.session_id:
            raise RuntimeError("TrendRadar initialize succeeded but returned no mcp-session-id")

        requests.post(
            self.base_url,
            headers={
                "Accept": DEFAULT_ACCEPT,
                "mcp-session-id": self.session_id,
            },
            json={
                "jsonrpc": "2.0",
                "method": "notifications/initialized",
                "params": {},
            },
            timeout=self.timeout,
        )

    def call_tool(self, name, arguments):
        if not self.session_id:
            self.initialize()

        response = requests.post(
            self.base_url,
            headers={
                "Accept": DEFAULT_ACCEPT,
                "mcp-session-id": self.session_id,
            },
            json={
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/call",
                "params": {
                    "name": name,
                    "arguments": arguments,
                },
            },
            timeout=self.timeout,
        )
        response.raise_for_status()
        response.encoding = "utf-8"
        payload = extract_event_json(response.text)
        result = payload.get("result", {})
        content = result.get("content", [])
        texts = [item.get("text", "") for item in content if item.get("type") == "text"]
        if not texts:
            raise RuntimeError("TrendRadar returned no text content")
        return json.loads("\n".join(texts))


def extract_event_json(text):
    data_lines = []
    for line in text.splitlines():
        if line.startswith("data: "):
            data_lines.append(line[6:])
        elif data_lines and not line.strip():
            break
    if data_lines:
        return json.loads("\n".join(data_lines))
    raise RuntimeError("TrendRadar returned no MCP data payload")


def normalize_item(item):
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
        "platform_name": item.get("feed_name", "RSS"),
        "url": item.get("url", ""),
        "timestamp": item.get("published_at") or item.get("date", "") or item.get("fetch_time", ""),
        "rank": None,
        "content_type": "rss",
    }


def deduplicate(items):
    seen = set()
    result = []
    for item in items:
        key = item["title"].strip().lower()
        if key and key not in seen:
            seen.add(key)
            result.append(item)
    return result


def score_item(item):
    hotness = int(item.get("hotness", 0) or 0)
    score = min(hotness, 1_000_000)

    rank = item.get("rank")
    if isinstance(rank, int):
        score += max(0, 1000 - rank * 10)

    if item.get("content_type") == "rss":
        score += 500

    if item.get("timestamp"):
        score += 100

    return score


def resolve_date_range(client, expression):
    raw = client.call_tool("resolve_date_range", {"expression": expression})
    if not raw.get("success"):
        raise RuntimeError(f"TrendRadar failed to resolve date range: {expression}")

    date_range = raw.get("date_range")
    if not isinstance(date_range, dict) or not date_range.get("start") or not date_range.get("end"):
        raise RuntimeError("TrendRadar resolve_date_range returned an invalid date_range payload")

    return date_range


def fetch_recent_news_and_rss(client, limit, include_url):
    date_range = resolve_date_range(client, DEFAULT_WINDOW_EXPRESSION)
    news_raw = client.call_tool(
        "get_news_by_date",
        {
            "date_range": date_range,
            "limit": limit,
            "include_url": include_url,
        },
    )
    rss_raw = client.call_tool(
        "get_latest_rss",
        {
            "days": 1,
            "limit": limit,
            "include_summary": False,
        },
    )

    items = [normalize_item(item) for item in news_raw.get("data", [])]
    items.extend(normalize_rss_item(item) for item in rss_raw.get("data", []))
    items = deduplicate(items)
    items.sort(key=score_item, reverse=True)

    return ["trendradar:get_news_by_date", "trendradar:get_latest_rss"], items


def main():
    parser = argparse.ArgumentParser(description="Fetch hotspots from TrendRadar MCP server")
    parser.add_argument("--limit", type=int, default=30, help="Max items to return")
    parser.add_argument("--query", type=str, default="", help="Optional search query")
    parser.add_argument(
        "--include-url",
        action="store_true",
        default=False,
        help="Include URLs when querying TrendRadar",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        stream=__import__("sys").stderr,
    )

    cfg = get_trendradar_config()
    if not cfg["enabled"]:
        raise SystemExit("TrendRadar is disabled in config.yaml")

    client = TrendRadarSession(cfg["base_url"], cfg["timeout"])
    if args.query:
        raw = client.call_tool(
            "search_news",
            {
                "query": args.query,
                "limit": args.limit,
                "include_url": args.include_url,
                "sort_by": "relevance",
            },
        )
        source_name = "trendradar:search_news"
        items = [normalize_item(item) for item in raw.get("data", [])]
        items = deduplicate(items)
        items.sort(key=score_item, reverse=True)
        sources = [source_name]
    else:
        sources, items = fetch_recent_news_and_rss(client, args.limit, args.include_url)

    output = {
        "timestamp": datetime.now().isoformat(),
        "sources": sources,
        "count": len(items),
        "items": items,
    }
    print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
