import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  autoFixEditorialIssues,
  inferArticleArchetype,
  runEditorialQa,
} from './editorial-qa.js';

test('inferArticleArchetype routes phenomenon analysis drafts to immersive longform', () => {
  const article = [
    '# 为什么一张三宫格图片会刷屏',
    '',
    '最近这两天，被一个三宫格图片给刷屏了。',
    '我真正好奇的不是它火了，而是它为什么会火到这个程度。',
    '顺着这个问题往下追，你会发现背后其实是同一类人生叙事需求。',
    '',
  ].join('\n');

  const result = inferArticleArchetype(article);

  assert.equal(result.archetype, 'phenomenon_analysis');
  assert.equal(result.outputShape, 'immersive_longform');
});

test('inferArticleArchetype routes methodology drafts to structured longform', () => {
  const article = [
    '# 我用 AI 三年的 3 条经验',
    '',
    '这篇文章我想分享三条真的能今天就执行的经验。',
    '',
    '## 第一条，先把一个环节跑通',
    '一开始可能会有点笨拙，花的时间比手动做还长。',
    '但你今天就可以先把一个最重复的环节交给 Claude Code。',
    '',
  ].join('\n');

  const result = inferArticleArchetype(article);

  assert.equal(result.archetype, 'methodology');
  assert.equal(result.outputShape, 'structured_longform');
});

test('autoFixEditorialIssues removes shallow AI phrasing and upgrades generic tool names when concrete tools exist', () => {
  const article = [
    '# 这篇文章的标题',
    '',
    '值得注意的是，随着AI的发展，这类AI工具越来越多。',
    '让我们来看看 Claude Code 到底带来了什么变化。',
    '',
  ].join('\n');

  const result = autoFixEditorialIssues(article);

  assert.doesNotMatch(result.content, /值得注意的是/);
  assert.doesNotMatch(result.content, /随着AI的发展/);
  assert.doesNotMatch(result.content, /让我们来看看/);
  assert.doesNotMatch(result.content, /AI工具/);
  assert.match(result.content, /Claude Code/);
});

test('runEditorialQa writes a fixed article bundle and quality report for drafts outside runtime bundles', async () => {
  const workspace = mkdtempSync(join(tmpdir(), 'ls-wechat-editorial-qa-'));
  const originalCwd = process.cwd();
  process.chdir(workspace);

  try {
    const runtimeRoot = join(workspace, '.ls-wechat-article');
    mkdirSync(runtimeRoot, { recursive: true });
    const inputPath = join(workspace, 'draft.md');
    writeFileSync(
      inputPath,
      [
        '# 为什么一张三宫格图片会刷屏',
        '',
        '最近这两天，被一个三宫格图片给刷屏了。',
        '值得注意的是，随着AI的发展，这类AI工具越来越多。',
        '让我们来看看 Claude Code 到底带来了什么变化。',
        '',
      ].join('\n'),
      'utf-8',
    );

    const result = await runEditorialQa({
      input: inputPath,
      client: 'demo',
    });

    assert.notEqual(result.articlePath, inputPath);
    assert.match(result.articlePath, /\/\.ls-wechat-article\/output\/demo\//);
    assert.equal(existsSync(result.articlePath), true);
    assert.equal(existsSync(result.reportPath), true);

    const fixedArticle = readFileSync(result.articlePath, 'utf-8');
    const report = readFileSync(result.reportPath, 'utf-8');

    assert.doesNotMatch(fixedArticle, /值得注意的是/);
    assert.match(report, /## 质检报告/);
    assert.match(report, /L1 硬性规则/);
    assert.match(report, /phenomenon_analysis/);
  } finally {
    process.chdir(originalCwd);
    rmSync(workspace, { recursive: true, force: true });
  }
});

test('runEditorialQa should not treat the H1 title as the opening paragraph in quality report', async () => {
  const workspace = mkdtempSync(join(tmpdir(), 'ls-wechat-editorial-opening-'));
  const originalCwd = process.cwd();
  process.chdir(workspace);

  try {
    const runtimeRoot = join(workspace, '.ls-wechat-article');
    mkdirSync(runtimeRoot, { recursive: true });
    const inputPath = join(workspace, 'opening.md');
    writeFileSync(
      inputPath,
      [
        '# 为什么真正拉开 Agent 差距的是 Harness',
        '',
        '凌晨一点多，我盯着终端里一段卡住的 Agent 输出，心里有点烦。',
        '模型没换。提示词也没大改。可它这一轮就是不对劲。',
        '',
        '## 第一部分',
        '这篇文章会拆解 harness 的结构。',
        '我也经历过这种时候。',
        '历史上的工具变革，往往都不是先赢在核心能力，而是赢在组织能力。',
        '',
      ].join('\n'),
      'utf-8',
    );

    const result = await runEditorialQa({
      input: inputPath,
      client: 'demo',
    });

    assert.match(result.articlePath, /\/\.ls-wechat-article\/output\/demo\//);
    const report = readFileSync(result.reportPath, 'utf-8');
    assert.match(report, /- 开头：✅/);
  } finally {
    process.chdir(originalCwd);
    rmSync(workspace, { recursive: true, force: true });
  }
});
