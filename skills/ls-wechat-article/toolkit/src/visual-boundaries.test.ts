import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { previewHtml } from './converter.js';
import { buildCoverImagePrompt, buildInlineImagePrompt } from './image-style-system.js';
import { calculateAspectCrop, needsAspectNormalization } from './image-gen.js';
import {
  illustrateMarkdown,
  injectImagesAtResolvedTargets,
  resolveIllustrationTargets,
} from './illustration-workflow.js';

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

test('resolveIllustrationTargets can match a paragraph anchor instead of only H2 headings', () => {
  const lines = [
    '# Hermes 最狠的，不是更聪明，而是让 Agent 开始长记性',
    '',
    '## 大多数 Agent 最大的问题，不是不会做事，而是每次都像第一次',
    '很多 Agent 看上去会规划，也会调用工具。',
    '',
    '真正的问题是，它们做成过的事留不下来。',
    '下一次遇到类似任务，还是从头再来。',
    '',
    '## Hermes 真正值钱的，不是会存 Skill，而是把 Skill 做成了闭环',
    'Hermes 最值钱的一点，是它会把失败记录也写回 Skill。',
    '这意味着经验不是静态模板，而是会被修补的资产。',
    '',
  ];

  const targets = resolveIllustrationTargets(lines, [
    {
      heading: 'Hermes 最值钱的一点，是它会把失败记录也写回 Skill。',
      inlineType: 'framework',
    },
  ]);

  assert.equal(targets.length, 1);
  assert.equal(targets[0]?.kind, 'paragraph');
  assert.equal(targets[0]?.sectionHeading, 'Hermes 真正值钱的，不是会存 Skill，而是把 Skill 做成了闭环');
  assert.match(targets[0]?.positionLabel ?? '', /Hermes 最值钱的一点/);
});

test('resolveIllustrationTargets still supports explicit H2 heading targets for backward compatibility', () => {
  const lines = [
    '# Hermes 最狠的，不是更聪明，而是让 Agent 开始长记性',
    '',
    '## Hermes 真正值钱的，不是会存 Skill，而是把 Skill 做成了闭环',
    'Hermes 最值钱的一点，是它会把失败记录也写回 Skill。',
    '',
  ];

  const targets = resolveIllustrationTargets(lines, [
    {
      heading: 'Hermes 真正值钱的，不是会存 Skill，而是把 Skill 做成了闭环',
      inlineType: 'framework',
    },
  ]);

  assert.equal(targets.length, 1);
  assert.equal(targets[0]?.kind, 'section');
  assert.equal(targets[0]?.positionLabel, 'Hermes 真正值钱的，不是会存 Skill，而是把 Skill 做成了闭环');
});

test('resolveIllustrationTargets can match intro paragraphs before the first H2', () => {
  const lines = [
    '---',
    'title: 测试文章',
    '---',
    '# 测试文章',
    '',
    '开头这一段没有任何 H2，但它先把问题抛出来。',
    '真正重要的是，这段导语本身就值得配图。',
    '',
    '## 第一部分',
    '后面才开始进入正式分节。',
    '',
  ];

  const targets = resolveIllustrationTargets(lines, [
    {
      heading: '真正重要的是，这段导语本身就值得配图。',
      inlineType: 'scene',
    },
  ]);

  assert.equal(targets.length, 1);
  assert.equal(targets[0]?.kind, 'paragraph');
  assert.equal(targets[0]?.sectionHeading, '测试文章');
  assert.match(targets[0]?.positionLabel ?? '', /真正重要的是/);
});

test('resolveIllustrationTargets works even when the article has no H2 or H3 headings', () => {
  const lines = [
    '# 没有分节的文章',
    '',
    '第一段先讲为什么这个问题重要。',
    '',
    '第二段直接讲判断：没有 H2 也应该能配图。',
    '否则文章结构一变，配图系统就挂了。',
    '',
  ];

  const targets = resolveIllustrationTargets(lines, [
    {
      heading: '第二段直接讲判断：没有 H2 也应该能配图。',
      inlineType: 'comparison',
    },
  ]);

  assert.equal(targets.length, 1);
  assert.equal(targets[0]?.kind, 'paragraph');
  assert.equal(targets[0]?.sectionHeading, '没有分节的文章');
  assert.match(targets[0]?.positionLabel ?? '', /第二段直接讲判断/);
});

test('injectImagesAtResolvedTargets inserts paragraph-targeted images after the matched paragraph block', () => {
  const lines = [
    '# Hermes 最狠的，不是更聪明，而是让 Agent 开始长记性',
    '',
    '## Hermes 真正值钱的，不是会存 Skill，而是把 Skill 做成了闭环',
    'Hermes 最值钱的一点，是它会把失败记录也写回 Skill。',
    '这意味着经验不是静态模板，而是会被修补的资产。',
    '',
    '再往后，Skill 会随着使用不断被修正。',
    '',
  ];

  const [target] = resolveIllustrationTargets(lines, [
    {
      heading: 'Hermes 最值钱的一点，是它会把失败记录也写回 Skill。',
      inlineType: 'framework',
    },
  ]);

  const markdown = injectImagesAtResolvedTargets(lines, [
    {
      ...target!,
      markdownPath: 'assets/inline-01.png',
      alt: 'Hermes 技能闭环',
    },
  ]);

  assert.match(
    markdown,
    /Hermes 最值钱的一点，是它会把失败记录也写回 Skill。\n这意味着经验不是静态模板，而是会被修补的资产。\n\n!\[Hermes 技能闭环\]\(assets\/inline-01\.png\)\n\n再往后，Skill 会随着使用不断被修正。\n/s,
  );
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
