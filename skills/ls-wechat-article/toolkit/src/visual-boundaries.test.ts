import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { previewHtml } from './converter.js';
import { buildCoverImagePrompt, buildInlineImagePrompt } from './image-style-system.js';
import { calculateAspectCrop, needsAspectNormalization } from './image-gen.js';
import { illustrateMarkdown } from './illustration-workflow.js';

test('buildCoverImagePrompt requires an explicit cover type', () => {
  assert.throws(
    () => buildCoverImagePrompt({
      articleTitle: 'Agent 工作流怎么设计',
      articleContent: '这篇文章讨论 Agent 工作流和结构化执行。',
      styleText: 'editorial',
      color: '#3498db',
      imageSystem: null,
    } as never),
    /cover type/i,
  );
});

test('buildInlineImagePrompt requires an explicit inline type', () => {
  assert.throws(
    () => buildInlineImagePrompt({
      articleTitle: 'Agent 工作流怎么设计',
      sectionHeading: '执行闭环',
      contentLines: ['先定义输入，再定义输出，最后定义回看路径。'],
      styleText: 'editorial',
      color: '#3498db',
      imageSystem: null,
    } as never),
    /inline type/i,
  );
});

test('illustrateMarkdown requires explicit inline targets from the agent', async () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'ls-wechat-boundary-'));
  const originalCwd = process.cwd();
  const articlePath = join(tempDir, 'article.md');
  mkdirSync(join(tempDir, '.ls-wechat-article'), { recursive: true });
  writeFileSync(
    articlePath,
    [
      '# Agent 工作流怎么设计',
      '',
      '## 执行闭环',
      '先定义输入，再定义输出，最后定义回看路径。',
      '',
      '## 验证层',
      '不要把验证留到最后，应该让验证跟执行一起发生。',
      '',
    ].join('\n'),
    'utf-8',
  );

  try {
    process.chdir(tempDir);
    await assert.rejects(
      () => illustrateMarkdown({
        input: articlePath,
        client: 'default',
        style: 'editorial',
        color: '#3498db',
      } as never),
      /target/i,
    );
  } finally {
    process.chdir(originalCwd);
  }

  rmSync(tempDir, { recursive: true, force: true });
});

test('article images normalize fixed-size outputs back to 16:9', () => {
  assert.equal(needsAspectNormalization(1536, 1024, 16 / 9), true);
  assert.deepEqual(calculateAspectCrop(1536, 1024, 16 / 9), {
    width: 1536,
    height: 864,
  });
});

test('cover images normalize fixed-size outputs back to 2.35:1', () => {
  assert.equal(needsAspectNormalization(1536, 1024, 2.35), true);
  assert.deepEqual(calculateAspectCrop(1536, 1024, 2.35), {
    width: 1536,
    height: 654,
  });
});

test('previewHtml carries a base href so relative inline images resolve from the markdown directory', () => {
  const html = previewHtml(
    '<section><img src="assets/inline-01.png" alt="inline"></section>',
    {
      name: 'Test Theme',
      key: 'test',
      description: 'test',
      color: '#3498db',
      styles: {} as never,
    } as never,
    'file:///tmp/ls-wechat-article/',
  );

  assert.match(html, /<base href="file:\/\/\/tmp\/ls-wechat-article\/">/);
});
