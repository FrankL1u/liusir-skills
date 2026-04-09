#!/usr/bin/env python3
from __future__ import annotations

import json


def main() -> int:
    hotspots = {
        "source": "trendradar",
        "items": [
            {"topic": "AI agent 协作", "heat": 8},
            {"topic": "效率工具栈升级", "heat": 7},
            {"topic": "创作者工作流自动化", "heat": 7},
        ],
    }
    print(json.dumps(hotspots, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
