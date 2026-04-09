#!/usr/bin/env python3
from __future__ import annotations

import json


def main() -> int:
    hotspots = [
        {"topic": "AI 编程 workflow", "signal": "creator-tech", "heat": 7},
        {"topic": "知识管理复盘", "signal": "productivity", "heat": 6},
        {"topic": "工具替代清单", "signal": "software", "heat": 8},
    ]
    print(json.dumps(hotspots, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
