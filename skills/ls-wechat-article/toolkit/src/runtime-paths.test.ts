import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import {
  getProjectRuntimeRoot,
  getUserRuntimeRoot,
  inferClientFromRuntimeArticlePath,
  resolveRuntimeReadPath,
  resolveRuntimeRoot,
  resolveRuntimeWritePath,
} from './runtime-paths.js';

test('resolveRuntimeRoot prefers project-local runtime data when it exists', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'ls-wechat-runtime-'));
  const projectRoot = getProjectRuntimeRoot(workspace);
  mkdirSync(projectRoot, { recursive: true });

  const resolved = resolveRuntimeRoot({ cwd: workspace, homeDir: join(workspace, 'home') });
  assert.equal(resolved, projectRoot);

  rmSync(workspace, { recursive: true, force: true });
});

test('resolveRuntimeRoot falls back to user-level runtime data when project-local data is absent', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'ls-wechat-runtime-'));
  const homeDir = join(workspace, 'home');
  const userRoot = getUserRuntimeRoot(homeDir);
  mkdirSync(userRoot, { recursive: true });

  const resolved = resolveRuntimeRoot({ cwd: workspace, homeDir });
  assert.equal(resolved, userRoot);

  rmSync(workspace, { recursive: true, force: true });
});

test('resolveRuntimeWritePath creates a project-local runtime root when none exists', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'ls-wechat-runtime-'));
  const target = resolveRuntimeWritePath(['clients', 'demo', 'history.yaml'], {
    cwd: workspace,
    homeDir: join(workspace, 'home'),
  });

  assert.equal(target, join(workspace, '.ls-wechat-article', 'clients', 'demo', 'history.yaml'));
  assert.equal(existsSync(join(workspace, '.ls-wechat-article')), true);

  rmSync(workspace, { recursive: true, force: true });
});

test('resolveRuntimeReadPath falls back to legacy skill-local files when no newer runtime root exists', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'ls-wechat-runtime-'));
  const legacyRoot = join(workspace, 'legacy-skill');
  mkdirSync(legacyRoot, { recursive: true });
  const legacyConfig = join(legacyRoot, 'config.yaml');
  writeFileSync(legacyConfig, 'theme: legacy\n', 'utf-8');

  const resolved = resolveRuntimeReadPath(['config.yaml'], {
    cwd: join(workspace, 'project'),
    homeDir: join(workspace, 'home'),
    legacyRoot,
  });

  assert.equal(resolved, legacyConfig);

  rmSync(workspace, { recursive: true, force: true });
});

test('inferClientFromRuntimeArticlePath recognizes articles stored under runtime output roots', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'ls-wechat-runtime-'));
  const articlePath = join(
    workspace,
    '.ls-wechat-article',
    'output',
    'demo',
    '2026-04-09-test',
    'article.md',
  );
  mkdirSync(dirname(articlePath), { recursive: true });

  const client = inferClientFromRuntimeArticlePath(articlePath, {
    cwd: workspace,
    homeDir: join(workspace, 'home'),
  });

  assert.equal(client, 'demo');

  rmSync(workspace, { recursive: true, force: true });
});

test('inferClientFromRuntimeArticlePath tolerates /var and /private/var aliases when cwd is inside tmpdir', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'ls-wechat-runtime-'));
  const originalCwd = process.cwd();
  const articlePath = join(
    workspace,
    '.ls-wechat-article',
    'output',
    'demo',
    '2026-04-09-test',
    'article.md',
  );
  mkdirSync(dirname(articlePath), { recursive: true });

  try {
    process.chdir(workspace);
    const client = inferClientFromRuntimeArticlePath(articlePath);
    assert.equal(client, 'demo');
  } finally {
    process.chdir(originalCwd);
    rmSync(workspace, { recursive: true, force: true });
  }
});
