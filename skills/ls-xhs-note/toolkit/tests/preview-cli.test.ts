import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtempSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const TOOLKIT_DIR = "/Users/frank/Documents/MyStudio/LS-SKILLS/skills/ls-xhs-note/toolkit";

test("preview should only resolve visual options and should not infer posting copy", () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "ls-xhs-note-preview-"));
  const notePath = path.join(tempDir, "note.md");

  writeFileSync(
    notePath,
    `工具替代别先比功能，先看交接成本 ⚠️

很多工具替代最后并没有省下时间，反而只是把返工换了个地方继续发生。
`,
    "utf-8",
  );

  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "src/cli.ts", "preview", notePath, "--preset", "blueprint-stack"],
    {
      cwd: TOOLKIT_DIR,
      encoding: "utf-8",
    },
  );

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);

  assert.equal(parsed.preset, "blueprint-stack");
  assert.equal(parsed.style, "tech-blueprint");
  assert.equal(parsed.layout, "dense");
  assert.equal("titleOptions" in parsed, false);
  assert.equal("hookOptions" in parsed, false);
  assert.equal("hashtags" in parsed, false);
});
