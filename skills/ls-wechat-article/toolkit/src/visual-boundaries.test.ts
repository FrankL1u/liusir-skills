import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { previewHtml } from './converter.js';
import { buildCoverImagePrompt, buildInlineImagePrompt } from './image-style-system.js';
import { calculateAspectCrop, needsAspectNormalization } from './image-gen.js';
import {
  DEFAULT_VISUALS,
  loadClientVisuals,
  loadVisualPromptSystem,
  migrateClientVisuals,
  migrateClientStyleFileInPlace,
} from './visual-prompt-system.js';
import {
  illustrateMarkdown,
  injectImagesAtResolvedTargets,
  resolveIllustrationTargets,
  stripGeneratedInlineImagesFromLines,
} from './illustration-workflow.js';

test('visual prompt system is loaded from Markdown configuration', () => {
  const system = loadVisualPromptSystem();

  assert.equal(system.defaults.cover.type, 'typography');
  assert.equal(system.defaults.cover.text_level, 'title-only');
  assert.equal(system.defaults.inline.density, 'balanced');
  assert.equal(system.defaults.inline.type_default, 'auto');
  assert.ok(system.styles.some(style => style.key === 'multi-panel-manga'));
  assert.ok(system.cover_types.some(type => type.key === 'typography'));
  assert.ok(system.inline_types.some(type => type.key === 'framework'));
  assert.match(system.global.negative_prompt, /低分辨率/);
});

test('migrateClientVisuals removes legacy image fields and creates visuals defaults', () => {
  const migrated = migrateClientVisuals({
    name: 'Demo',
    cover_style: 'multi-panel-manga 多格漫画风',
    image_system: {
      defaults: {
        cover_style: 'multi-panel-manga',
        inline_style: 'blueprint',
        cover_type: 'conceptual',
      },
    },
  });

  assert.equal(migrated.visuals.style, 'multi-panel-manga');
  assert.equal(migrated.visuals.cover.type, 'typography');
  assert.equal(migrated.visuals.cover.text_level, 'title-only');
  assert.equal(migrated.visuals.inline.density, 'balanced');
  assert.equal(migrated.visuals.inline.type_default, 'auto');
  assert.equal('cover_style' in migrated, false);
  assert.equal('image_system' in migrated, false);
});

test('migrateClientVisuals initializes visuals when missing', () => {
  const migrated = migrateClientVisuals({ name: 'Demo' });

  assert.deepEqual(migrated.visuals, DEFAULT_VISUALS);
});

test('migrateClientStyleFileInPlace removes legacy visual fields from style.yaml', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'ls-wechat-visuals-'));
  const originalCwd = process.cwd();
  const styleDir = join(tempDir, '.ls-wechat-article', 'clients', 'demo');
  const stylePath = join(styleDir, 'style.yaml');
  mkdirSync(styleDir, { recursive: true });
  writeFileSync(
    stylePath,
    [
      'name: Demo',
      'cover_style: "blueprint 技术蓝图风"',
      'image_system:',
      '  defaults:',
      '    cover_style: "blueprint"',
      '',
    ].join('\n'),
    'utf-8',
  );

  try {
    process.chdir(tempDir);
    assert.equal(migrateClientStyleFileInPlace('demo'), true);
    const migrated = readFileSync(stylePath, 'utf-8');
    assert.match(migrated, /visuals:/);
    assert.match(migrated, /# 配图范围。/);
    assert.match(migrated, /# 可选值：cover\+inline, cover-only, inline-only, none/);
    assert.match(migrated, /# 主视觉风格。/);
    assert.match(migrated, /# 可选值：follow article tone, editorial, blueprint, notion, warm, watercolor, scientific, lofi-doodle, multi-panel-manga, notebook-sketch, claymation/);
    assert.match(migrated, /# 正文插图默认类型。/);
    assert.match(migrated, /# 可选值：auto, infographic, scene, flowchart, comparison, framework, timeline/);
    assert.match(migrated, /style: blueprint/);
    assert.doesNotMatch(migrated, /cover_style:/);
    assert.doesNotMatch(migrated, /image_system:/);
  } finally {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('loadClientVisuals does not initialize style.yaml when visuals is missing', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'ls-wechat-first-visuals-'));
  const originalCwd = process.cwd();
  const styleDir = join(tempDir, '.ls-wechat-article', 'clients', 'demo');
  const stylePath = join(styleDir, 'style.yaml');
  const originalStyle = [
    'name: Demo',
    'theme: wechat-tech',
    '',
  ].join('\n');
  mkdirSync(styleDir, { recursive: true });
  writeFileSync(stylePath, originalStyle, 'utf-8');

  try {
    process.chdir(tempDir);
    const visuals = loadClientVisuals('demo');
    const currentStyle = readFileSync(stylePath, 'utf-8');
    assert.deepEqual(visuals, DEFAULT_VISUALS);
    assert.equal(currentStyle, originalStyle);
  } finally {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
  }
});

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

test('stripGeneratedInlineImagesFromLines removes previous generated inline images before rerun', () => {
  const lines = [
    '# OpenClaw 企业 Agent 路径',
    '',
    '## 你以为是模型不够聪明，其实是脚手架太薄',
    '模型是引擎。Harness 是底盘。',
    '',
    '![旧图](assets/inline-01.png)',
    '',
    '![旧图重复](assets/inline-01.png)',
    '',
    '## 靠人喂 vs 自己长',
    '这不是功能差异，是设计哲学的分野。',
    '',
    '![旧图二](assets/inline-02.png)',
    '',
    '![手工配图](assets/manual-diagram.png)',
    '',
  ];

  const cleaned = stripGeneratedInlineImagesFromLines(lines);

  assert.equal(cleaned.some(line => line.includes('assets/inline-01.png')), false);
  assert.equal(cleaned.some(line => line.includes('assets/inline-02.png')), false);
  assert.equal(cleaned.some(line => line.includes('assets/manual-diagram.png')), true);
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
