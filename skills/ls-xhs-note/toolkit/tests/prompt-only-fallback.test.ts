import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { generateImageToFile } from "../src/image-gen.js";

const TOOLKIT_DIR = "/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-xhs-note/toolkit";

test("prompt-only image generation should write a fallback txt instead of corrupting the png path", async () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "ls-xhs-note-fallback-"));
  const imagePath = path.join(tempDir, "card.png");

  const result = await generateImageToFile({
    prompt: "test prompt",
    output: imagePath,
    size: "series",
    provider: "missing-provider",
  });

  assert.equal(result.status, "prompt_only");
  assert.equal(result.output.endsWith("-fallback.txt"), true);
  assert.equal(existsSync(result.output), true);
  assert.equal(existsSync(imagePath), false);
  assert.match(readFileSync(result.output, "utf-8"), /provider=missing-provider/);
});

test("series manifest should point to the fallback artifact when image generation falls back to prompt-only", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "ls-xhs-note-series-"));
  const bundleDir = path.join(tempRoot, "demo", "2026-01-01-sample-note");
  mkdirSync(bundleDir, { recursive: true });

  const notePath = path.join(bundleDir, "note.md");
  const planPath = path.join(bundleDir, "series-plan.json");

  writeFileSync(notePath, "示例标题\n\n这是一条测试笔记。\n", "utf-8");
  writeFileSync(
    planPath,
    JSON.stringify(
      {
        markdownPath: notePath,
        client: "demo",
        slug: "sample-note",
        preset: "editorial",
        slides: [
          {
            type: "content",
            title: "测试页",
            prompt: "Create a test social graphic prompt",
          },
        ],
      },
      null,
      2,
    ),
    "utf-8",
  );

  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "src/cli.ts", "series", planPath, "--provider", "missing-provider", "--yes"],
    {
      cwd: TOOLKIT_DIR,
      encoding: "utf-8",
    },
  );

  assert.equal(result.status, 0, result.stderr);

  const manifestPath = path.join(bundleDir, "series-manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
  const slide = manifest.slides[0];

  assert.equal(slide.status, "prompt_only");
  assert.equal(slide.outputPath, "images/01-content-sample-note-fallback.txt");
  assert.equal(existsSync(path.join(bundleDir, slide.outputPath)), true);
  assert.equal(existsSync(path.join(bundleDir, "images", "01-content-sample-note.png")), false);
});
