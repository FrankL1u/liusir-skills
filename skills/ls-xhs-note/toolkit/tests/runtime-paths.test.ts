import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { existsSync, mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import {
  getProjectRuntimeRoot,
  getUserRuntimeRoot,
  inferClientFromRuntimeOutputPath,
  resolveRuntimeReadPath,
  resolveWritableRuntimeRoot,
} from "../src/runtime-paths.js";
import { ensureBundleDir } from "../src/bundle-utils.js";

test("resolveWritableRuntimeRoot creates a project-local .ls-xhs-note directory by default", () => {
  const cwd = mkdtempSync(path.join(os.tmpdir(), "ls-xhs-note-runtime-"));
  const root = resolveWritableRuntimeRoot({ cwd, homeDir: path.join(cwd, "home") });

  assert.ok(root.endsWith(`${path.sep}.ls-xhs-note`));
  assert.ok(existsSync(root));
  assert.equal(root, getProjectRuntimeRoot(cwd));
});

test("resolveRuntimeReadPath falls back to user root then legacy root", () => {
  const cwd = mkdtempSync(path.join(os.tmpdir(), "ls-xhs-note-read-"));
  const homeDir = path.join(cwd, "home");
  const legacyRoot = path.join(cwd, "legacy");

  mkdirSync(getUserRuntimeRoot(homeDir), { recursive: true });
  const userConfig = path.join(getUserRuntimeRoot(homeDir), "config.yaml");
  writeFileSync(userConfig, "image: {}\n", "utf-8");

  const resolvedFromUser = resolveRuntimeReadPath(["config.yaml"], {
    cwd,
    homeDir,
    legacyRoot,
  });
  assert.equal(resolvedFromUser, userConfig);

  const projectRoot = getProjectRuntimeRoot(cwd);
  if (existsSync(projectRoot)) {
    throw new Error("project runtime root should not exist in this test");
  }
  mkdirSync(legacyRoot, { recursive: true });
  const legacyConfig = path.join(legacyRoot, "config.yaml");
  writeFileSync(legacyConfig, "image: { default_provider: qwen }\n", "utf-8");
  const resolvedFromLegacy = resolveRuntimeReadPath(["config.yaml"], {
    cwd: mkdtempSync(path.join(os.tmpdir(), "ls-xhs-note-legacy-")),
    homeDir: path.join(cwd, "missing-home"),
    legacyRoot,
  });
  assert.equal(resolvedFromLegacy, legacyConfig);
});

test("ensureBundleDir writes new bundles under the runtime output root", async () => {
  const cwd = mkdtempSync(path.join(os.tmpdir(), "ls-xhs-note-bundle-"));
  const previousCwd = process.cwd();
  process.chdir(cwd);

  try {
    const markdownPath = path.join(cwd, "note.md");
    writeFileSync(markdownPath, "# Bundle test\n", "utf-8");
    const bundleDir = await ensureBundleDir(markdownPath, "demo", "bundle-test");

    assert.ok(bundleDir.includes(`${path.sep}.ls-xhs-note${path.sep}output${path.sep}demo${path.sep}`));
    assert.ok(existsSync(path.join(bundleDir, "images")));
    assert.ok(existsSync(path.join(bundleDir, "prompts")));
  } finally {
    process.chdir(previousCwd);
  }
});

test("inferClientFromRuntimeOutputPath recognizes clients inside runtime output folders", () => {
  const cwd = mkdtempSync(path.join(os.tmpdir(), "ls-xhs-note-client-"));
  const articlePath = path.join(cwd, ".ls-xhs-note", "output", "brand-a", "2026-04-09-note", "note.md");

  assert.equal(
    inferClientFromRuntimeOutputPath(articlePath, {
      cwd,
      homeDir: path.join(cwd, "home"),
      legacyRoot: path.join(cwd, "legacy"),
    }),
    "brand-a",
  );
});
