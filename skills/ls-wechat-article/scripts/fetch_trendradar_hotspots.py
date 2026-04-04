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
ROOT = Path(__file__).resolve().parents[1]


def load_config():
    for path in [ROOT / "config.yaml", ROOT / "config.example.yaml"]:
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
    else:
        raw = client.call_tool(
            "get_latest_news",
            {
                "limit": args.limit,
                "include_url": args.include_url,
            },
        )
        source_name = "trendradar:get_latest_news"

    items = [normalize_item(item) for item in raw.get("data", [])]
    items = deduplicate(items)
    items.sort(key=lambda x: int(x.get("hotness", 0) or 0), reverse=True)

    output = {
        "timestamp": datetime.now().isoformat(),
        "sources": [source_name],
        "count": len(items),
        "items": items,
    }
    print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
