#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

REQUIRED_PATHS = [
    "SKILL.md",
    "README.md",
    ".clawhubignore",
    "config.example.yaml",
    "config/image-system.yaml",
    "agents/openai.yaml",
    "references/cli-reference.md",
    "references/drafting-skeletons.md",
    "references/frameworks.md",
    "references/operations.md",
    "references/pipeline.md",
    "references/presets/clean-grid.md",
    "references/presets/study-board.md",
    "references/presets/contrast-poster.md",
    "references/presets/handwritten-flow.md",
    "references/style-presets.md",
    "references/title-rules.md",
    "references/skill-maintenance.md",
    "references/style-template.md",
    "references/topic-selection.md",
    "references/visual-prompts.md",
    "references/workflows/prompt-assembly.md",
    "references/writing-guide.md",
    "references/style-selection.md",
    "references/xhs-constraints.md",
    "scripts/fetch_hotspots.py",
    "scripts/fetch_trendradar_hotspots.py",
    "scripts/title_keywords.py",
    "toolkit/package.json",
    "toolkit/src/build-playbook.ts",
    "toolkit/src/cli.ts",
    "toolkit/src/image-gen.ts",
    "toolkit/src/learn-edits.ts",
    "clients/demo/style.yaml",
    "clients/demo/history.yaml",
    "output/.gitkeep",
]

REQUIRED_SKILL_HEADINGS = [
    "## Setup",
    "## Skill Directory",
    "## Pipeline Overview",
    "## Critical Quality Rules",
    "## Resilience: Never Stop on a Single-Step Failure",
    "## Operations",
    "## Gotchas",
    "## Comparison",
    "## References",
]

REQUIRED_PACKAGE_SCRIPTS = [
    "build",
    "dev",
    "test",
    "preview",
    "series",
    "styles",
    "layouts",
    "presets",
    "image-gen",
    "learn-edits",
    "build-playbook",
    "validate-skill",
]

README_MUST_MENTION = [
    "agents/openai.yaml",
    "scripts/validate_skill.py",
    "image-gen.ts",
    "build-playbook.ts",
    "learn-edits.ts",
    "npm run validate-skill",
    "source-article.md",
    "note.md",
    "series-plan.json",
    "series-outline.md",
    "series-manifest.json",
]

CLI_REFERENCE_TOKENS = [
    "dist/cli.js",
    "dist/image-gen.js",
    "dist/learn-edits.js",
    "dist/build-playbook.js",
    "dist/cli.js series",
]

PIPELINE_STEP5_TOKENS = [
    "series-plan.json",
    "series-outline.md",
    "Step 5 is image generation",
    "node dist/cli.js series",
]

BANNED_PATTERNS = [
    re.compile(r"liusir\d+", re.IGNORECASE),
]


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []

    for rel_path in REQUIRED_PATHS:
        if not (ROOT / rel_path).exists():
            errors.append(f"Missing required path: {rel_path}")

    skill_text = read_text("SKILL.md", errors)
    if skill_text:
        check_frontmatter("SKILL.md", skill_text, errors)
        for heading in REQUIRED_SKILL_HEADINGS:
            if heading not in skill_text:
                errors.append(f"SKILL.md is missing heading: {heading}")
        check_banned_tokens("SKILL.md", skill_text, errors)

    readme_text = read_text("README.md", errors)
    if readme_text:
        for token in README_MUST_MENTION:
            if token not in readme_text:
                errors.append(f"README.md should mention: {token}")
        check_banned_tokens("README.md", readme_text, errors)

    openai_yaml = read_text("agents/openai.yaml", errors)
    if openai_yaml:
        for token in ("interface:", "display_name:", "short_description:", "default_prompt:"):
            if token not in openai_yaml:
                errors.append(f"agents/openai.yaml is missing token: {token}")
        check_banned_tokens("agents/openai.yaml", openai_yaml, errors)

    cli_reference = read_text("references/cli-reference.md", errors)
    if cli_reference:
        for token in CLI_REFERENCE_TOKENS:
            if token not in cli_reference:
                errors.append(f"references/cli-reference.md should mention: {token}")

    pipeline_text = read_text("references/pipeline.md", errors)
    if pipeline_text:
        for token in PIPELINE_STEP5_TOKENS:
            if token not in pipeline_text:
                errors.append(f"references/pipeline.md should mention Step 5 token: {token}")

    if skill_text:
        for token in ("homepage:", "primaryEnv:", "env:"):
            if token not in skill_text:
                errors.append(f"SKILL.md should include openclaw metadata token: {token}")

    package_json = read_json("toolkit/package.json", errors)
    if package_json is not None:
        scripts = package_json.get("scripts", {})
        if not isinstance(scripts, dict):
            errors.append("toolkit/package.json has a non-object scripts field.")
        else:
            for name in REQUIRED_PACKAGE_SCRIPTS:
                if name not in scripts:
                    errors.append(f"toolkit/package.json is missing npm script: {name}")

    for rel_path in ("clients/demo/style.yaml", "clients/demo/playbook.md"):
        text = read_text(rel_path, errors)
        if text:
          check_banned_tokens(rel_path, text, errors)

    print(f"Checked skill at: {ROOT}")
    for message in warnings:
        print(f"WARN  {message}")
    for message in errors:
        print(f"ERROR {message}")

    if errors:
        print(f"\nValidation failed with {len(errors)} error(s) and {len(warnings)} warning(s).")
        return 1

    print(f"Validation passed with {len(warnings)} warning(s).")
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


def check_frontmatter(rel_path: str, text: str, errors: list[str]) -> None:
    match = re.match(r"^---\n(.*?)\n---\n", text, re.DOTALL)
    if not match:
        errors.append(f"{rel_path} is missing YAML frontmatter.")
        return

    frontmatter = match.group(1)
    for field in ("name:", "description:"):
        if field not in frontmatter:
            errors.append(f"{rel_path} frontmatter is missing field: {field[:-1]}")


def check_banned_tokens(rel_path: str, text: str, errors: list[str]) -> None:
    for pattern in BANNED_PATTERNS:
        if pattern.search(text):
            errors.append(f"{rel_path} contains banned pattern: {pattern.pattern}")


if __name__ == "__main__":
    raise SystemExit(main())
