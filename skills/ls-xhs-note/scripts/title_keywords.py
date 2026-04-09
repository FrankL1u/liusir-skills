#!/usr/bin/env python3
from __future__ import annotations

import json
import sys


def main() -> int:
    seed = " ".join(sys.argv[1:]).strip() or "AI 工作流"
    result = {
        "seed": seed,
        "keywords": [seed, f"{seed} 避坑", f"{seed} 模板", f"{seed} 效率"],
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
