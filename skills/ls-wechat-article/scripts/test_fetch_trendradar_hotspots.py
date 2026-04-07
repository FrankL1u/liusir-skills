import importlib.util
import sys
import types
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("fetch_trendradar_hotspots.py")
sys.modules.setdefault("requests", types.SimpleNamespace(post=None))
sys.modules.setdefault("yaml", types.SimpleNamespace(safe_load=lambda *_args, **_kwargs: {}))
SPEC = importlib.util.spec_from_file_location("fetch_trendradar_hotspots", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(MODULE)


class FakeClient:
    def __init__(self):
        self.calls = []

    def call_tool(self, name, arguments):
        self.calls.append((name, arguments))
        if name == "resolve_date_range":
            return {
                "success": True,
                "date_range": {"start": "2026-04-07", "end": "2026-04-07"},
            }
        if name == "get_news_by_date":
            return {
                "data": [
                    {
                        "title": "AI 基础设施融资新高",
                        "platform": "36kr",
                        "platform_name": "36kr快讯",
                        "rank": 1,
                        "count": 10,
                        "date": "2026-04-07",
                        "url": "https://example.com/news",
                    }
                ]
            }
        if name == "get_latest_rss":
            return {
                "data": [
                    {
                        "title": "Codex 使用心得",
                        "feed_id": "guizang",
                        "feed_name": "歸藏",
                        "url": "https://example.com/rss",
                        "published_at": "2026-04-07T03:32:07",
                    }
                ]
            }
        raise AssertionError(f"Unexpected tool call: {name}")


class FetchTrendRadarHotspotsTest(unittest.TestCase):
    def test_fetch_recent_news_and_rss_merges_sources(self):
        client = FakeClient()

        sources, items = MODULE.fetch_recent_news_and_rss(client, limit=5, include_url=True)

        self.assertEqual(
            client.calls,
            [
                ("resolve_date_range", {"expression": "最近1天"}),
                (
                    "get_news_by_date",
                    {
                        "date_range": {"start": "2026-04-07", "end": "2026-04-07"},
                        "limit": 5,
                        "include_url": True,
                    },
                ),
                (
                    "get_latest_rss",
                    {
                        "days": 1,
                        "limit": 5,
                        "include_summary": False,
                    },
                ),
            ],
        )
        self.assertEqual(
            sources,
            ["trendradar:get_news_by_date", "trendradar:get_latest_rss"],
        )
        self.assertEqual(len(items), 2)
        self.assertEqual(items[0]["content_type"], "news")
        self.assertEqual(items[1]["content_type"], "rss")
        self.assertEqual(items[1]["platform_name"], "歸藏")

    def test_normalize_rss_item_uses_rss_fields(self):
        item = MODULE.normalize_rss_item(
            {
                "title": "Test RSS",
                "feed_id": "feed-x",
                "feed_name": "Feed X",
                "url": "https://example.com/rss-item",
                "published_at": "2026-04-07T10:00:00",
            }
        )

        self.assertEqual(
            item,
            {
                "title": "Test RSS",
                "hotness": 0,
                "source": "feed-x",
                "platform_name": "Feed X",
                "url": "https://example.com/rss-item",
                "timestamp": "2026-04-07T10:00:00",
                "rank": None,
                "content_type": "rss",
            },
        )


if __name__ == "__main__":
    unittest.main()
