import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import { resolveArticleBundlePathsForInput } from './article-bundle.js';

test('resolveArticleBundlePathsForInput reuses the existing runtime bundle for article.md inputs', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'ls-wechat-bundle-'));
  const originalCwd = process.cwd();
  const articlePath = join(
    workspace,
    '.ls-wechat-article',
    'output',
    'demo',
    '2026-04-14-kimi-k2-6-coding',
    'article.md',
  );
  mkdirSync(dirname(articlePath), { recursive: true });

  try {
    process.chdir(workspace);

    const bundle = resolveArticleBundlePathsForInput({
      inputPath: articlePath,
      title: 'Kimi K2.6 写代码一周后，我发现它最强的不是写代码',
      client: 'demo',
    });

    assert.equal(bundle.bundleDir, dirname(articlePath));
    assert.equal(bundle.articlePath, articlePath);
    assert.equal(bundle.coverPath, join(dirname(articlePath), 'cover.png'));
    assert.equal(bundle.assetsDir, join(dirname(articlePath), 'assets'));
    assert.equal(bundle.promptsDir, join(dirname(articlePath), 'prompts'));
  } finally {
    process.chdir(originalCwd);
    rmSync(workspace, { recursive: true, force: true });
  }
});
