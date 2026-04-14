#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

REQUIRED_PATHS = [
    ".clawhubignore",
    "SKILL.md",
    "README.md",
    "README_ZH.md",
    "config.example.yaml",
    "agents/openai.yaml",
    "references/setup.md",
    "references/pipeline.md",
    "references/routing-rules.md",
    "references/provider-matrix.md",
    "references/output-contract.md",
    "references/error-handling.md",
    "references/skill-maintenance.md",
    "prompts/transcriptCleanup.md",
    "prompts/translateText.md",
    "scripts/validate_skill.py",
    "toolkit/package.json",
    "toolkit/tsconfig.json",
    "toolkit/src/cli.ts",
    "toolkit/src/downloadVideo.ts",
    "toolkit/src/transcriptVideo.ts",
    "toolkit/src/fetchArticle.ts",
    "toolkit/src/cleanTranscript.ts",
    "toolkit/src/detectSource.ts",
    "toolkit/src/normalizeInput.ts",
    "toolkit/src/renderReport.ts",
    "toolkit/src/writeOutput.ts",
    "toolkit/src/env.ts",
    "toolkit/src/doctor.ts",
]

REQUIRED_SKILL_HEADINGS = [
    "# LS Multi Collector",
    "## Onboarding",
    "## Usage",
    "## Setup",
    "## Optional: ASR / LLM",
    "## Skill Directory",
    "## Execution Modes",
    "## Critical Quality Rules",
    "## Pipeline Overview",
    "## Resilience: Never Stop on a Single-Step Failure",
    "## Operations",
    "## Gotchas — Common Failure Patterns",
    "## Comparison",
    "## References",
]

REQUIRED_FRONTMATTER_FIELDS = [
    "name:",
    "version:",
    "description:",
    "triggers:",
    "metadata:",
]

REQUIRED_PACKAGE_SCRIPTS = [
    "build",
    "doctor",
    "download-video",
    "transcript-video",
    "fetch-article",
    "validate-skill",
]

README_TOKENS = [
    "agents/openai.yaml",
    "scripts/validate_skill.py",
    "npm run build",
    "npm run validate-skill",
]


def main() -> int:
    errors: list[str] = []

    for rel_path in REQUIRED_PATHS:
      if not (ROOT / rel_path).exists():
          errors.append(f"Missing required path: {rel_path}")

    skill_text = read_text("SKILL.md", errors)
    if skill_text:
        frontmatter = read_frontmatter(skill_text)
        if not frontmatter:
            errors.append("SKILL.md is missing YAML frontmatter.")
        else:
            for field in REQUIRED_FRONTMATTER_FIELDS:
                if field not in frontmatter:
                    errors.append(f"SKILL.md frontmatter is missing field: {field[:-1]}")
        for heading in REQUIRED_SKILL_HEADINGS:
            if heading not in skill_text:
                errors.append(f"SKILL.md is missing heading: {heading}")

    readme_text = read_text("README.md", errors)
    if readme_text:
        for token in README_TOKENS:
            if token not in readme_text:
                errors.append(f"README.md should mention: {token}")

    package_json = read_json("toolkit/package.json", errors)
    if package_json is not None:
        scripts = package_json.get("scripts", {})
        if not isinstance(scripts, dict):
            errors.append("toolkit/package.json has a non-object scripts field.")
        else:
            for script_name in REQUIRED_PACKAGE_SCRIPTS:
                if script_name not in scripts:
                    errors.append(f"toolkit/package.json is missing npm script: {script_name}")

    for doc_path, raw_path, resolved_path in collect_local_doc_paths([
        ROOT / "SKILL.md",
        ROOT / "README.md",
        ROOT / "references" / "pipeline.md",
        ROOT / "references" / "setup.md",
        ROOT / "references" / "skill-maintenance.md",
    ]):
        if not resolved_path.exists():
            errors.append(f"{doc_path.relative_to(ROOT)} references missing local path: {raw_path}")

    print(f"Checked skill at: {ROOT}")
    for message in errors:
        print(f"ERROR {message}")

    if errors:
        print(f"\nValidation failed with {len(errors)} error(s).")
        return 1

    print("Validation passed.")
    return 0


def read_text(rel_path: str, errors: list[str]) -> str:
    path = ROOT / rel_path
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return ""
    except OSError as exc:
        errors.append(f"Unable to read {rel_path}: {exc}")
        return ""


def read_json(rel_path: str, errors: list[str]) -> dict | None:
    path = ROOT / rel_path
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return None
    except json.JSONDecodeError as exc:
        errors.append(f"Invalid JSON in {rel_path}: {exc}")
        return None
    except OSError as exc:
        errors.append(f"Unable to read {rel_path}: {exc}")
        return None


def read_frontmatter(text: str) -> str | None:
    match = re.match(r"^---\n(.*?)\n---\n", text, re.DOTALL)
    return match.group(1) if match else None


def collect_local_doc_paths(doc_paths: list[Path]) -> list[tuple[Path, str, Path]]:
    found: list[tuple[Path, str, Path]] = []
    seen: set[tuple[str, str]] = set()
    allowed_prefixes = (
        "SKILL.md",
        "README.md",
        "config.example.yaml",
        "agents/",
        "references/",
        "prompts/",
        "scripts/",
        "toolkit/",
        ".ls-multi-collector/",
        "output/",
    )

    for doc_path in doc_paths:
        text = doc_path.read_text(encoding="utf-8")
        for raw_path in re.findall(r"`([^`\n]+)`", text):
            if raw_path.startswith("http") or not raw_path.startswith(allowed_prefixes):
                continue
            resolved = (ROOT / raw_path).resolve()
            key = (str(doc_path), raw_path)
            if key in seen:
                continue
            seen.add(key)
            found.append((doc_path, raw_path, resolved))
    return found


if __name__ == "__main__":
    raise SystemExit(main())
