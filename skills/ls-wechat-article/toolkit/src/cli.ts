#!/usr/bin/env tsx
/**
 * CLI entry point for the LS WeChat skill.
 *
 * Usage:
 *   npx tsx src/cli.ts preview article.md --theme wechat-tech
 *   npx tsx src/cli.ts publish article.md --theme latepost-depth
 *   npx tsx src/cli.ts themes
 *   npx tsx src/cli.ts colors
 *   npx tsx src/cli.ts theme-preview article.md
 */

import { Command } from 'commander';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

import { WeChatConverter, previewHtml } from './converter.js';
import {
  DEFAULT_COLOR,
  DEFAULT_THEME,
  type FontFamily,
  type HeadingSize,
  type ParagraphSpacing,
  type Theme,
  type ThemeKey,
  type ThemeStyles,
  listPresetColors,
  listThemes,
} from './theme-engine.js';
import { getAccessToken, uploadImage, uploadThumb } from './wechat-api.js';
import { createDraft } from './publisher.js';
import { illustrateMarkdown, type IllustrateTargetInput } from './illustration-workflow.js';
import { generateArticleCover } from './cover-workflow.js';
import { recordPublishHistory } from './history.js';
import { loadClientStyle, resolvePublishAuthor } from './client-style.js';
import {
  parseBenchmarkArticleTypes,
  parseBenchmarkStyles,
  runStyleBenchmark,
} from './style-benchmark.js';
import { findRuntimeConfigPath, inferClientFromRuntimeArticlePath } from './runtime-paths.js';
import { runEditorialQa } from './editorial-qa.js';

// --- Config Loading ---

import { existsSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';

function loadConfig(): Record<string, unknown> {
  const configPath = findRuntimeConfigPath();
  if (configPath && existsSync(configPath)) {
    return parseYaml(readFileSync(configPath, 'utf-8')) || {};
  }
  return {};
}

function loadCustomTheme(jsonPath: string): Theme {
  const raw = JSON.parse(readFileSync(resolve(jsonPath), 'utf-8'));
  const styles: ThemeStyles = raw.styles ?? raw;
  return {
    name: raw.meta?.name ?? 'Custom Theme',
    key: 'custom' as ThemeKey,
    description: raw.meta?.description ?? 'Custom theme',
    color: raw.tokens?.color ?? DEFAULT_COLOR,
    styles,
  };
}

async function materializeRemoteImage(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) {
    throw new Error(`Failed to download cover image: HTTP ${response.status}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const tempDir = await mkdtemp(resolve(tmpdir(), 'ls-wechat-cover-'));
  const filePath = resolve(tempDir, `cover.${ext}`);
  await writeFile(filePath, bytes);
  return filePath;
}

async function resolveCoverPath(explicitCover: string | undefined, images: string[], mdDir: string): Promise<string | undefined> {
  if (explicitCover) return explicitCover;
  const firstImage = images[0];
  if (!firstImage) return undefined;

  if (firstImage.startsWith('http://') || firstImage.startsWith('https://')) {
    return materializeRemoteImage(firstImage);
  }

  let imagePath = resolve(firstImage);
  if (!existsSync(imagePath)) {
    imagePath = join(mdDir, firstImage);
  }
  return existsSync(imagePath) ? imagePath : undefined;
}

function parseIllustrationTargets(specs: string[] | undefined): IllustrateTargetInput[] {
  if (!specs?.length) {
    throw new Error('At least one --target "<section heading>::<inlineType>" value is required.');
  }

  return specs.map(spec => {
    const separatorIndex = spec.lastIndexOf('::');
    if (separatorIndex <= 0 || separatorIndex === spec.length - 2) {
      throw new Error(`Invalid --target value: ${spec}. Expected "<section heading>::<inlineType>".`);
    }

    const heading = spec.slice(0, separatorIndex).trim();
    const inlineType = spec.slice(separatorIndex + 2).trim();
    if (!heading || !inlineType) {
      throw new Error(`Invalid --target value: ${spec}. Expected "<section heading>::<inlineType>".`);
    }

    return { heading, inlineType };
  });
}

function buildPreviewBaseHref(inputPath: string): string {
  const directoryUrl = pathToFileURL(dirname(resolve(inputPath))).href;
  return directoryUrl.endsWith('/') ? directoryUrl : `${directoryUrl}/`;
}

// --- Commands ---

const program = new Command();

program
  .name('ls-wechat')
  .description('LS WeChat: Markdown to WeChat HTML with dynamic themes')
  .version('1.0.0');

program
  .command('preview')
  .description('Generate HTML preview and open in browser')
  .argument('<input>', 'Markdown file path')
  .option('-t, --theme <key>', 'Theme key (run `ls-wechat themes` to list available presets)', DEFAULT_THEME)
  .option('-o, --output <path>', 'Output HTML file path')
  .option('--no-open', "Don't open browser")
  .option('--font <key>', 'Font: default, optima, serif', 'default')
  .option('--font-size <n>', 'Body font size (14-18)', '16')
  .option('--heading-size <key>', 'Heading size: minus2, minus1, standard, plus1', 'standard')
  .option('--paragraph-spacing <key>', 'Paragraph spacing: compact, normal, loose', 'normal')
  .option('--custom-theme <path>', 'Custom theme JSON file path')
  .action(async (input: string, opts) => {
    const converter = new WeChatConverter({
      themeKey: opts.theme as ThemeKey,
      fontFamily: opts.font as FontFamily,
      fontSize: parseInt(opts.fontSize),
      headingSize: opts.headingSize as HeadingSize,
      paragraphSpacing: opts.paragraphSpacing as ParagraphSpacing,
      ...(opts.customTheme ? { customTheme: loadCustomTheme(opts.customTheme) } : {}),
    });

    const result = converter.convertFile(input);
    const fullHtml = previewHtml(result.html, converter.getTheme(), buildPreviewBaseHref(input));

    const outputPath = opts.output || input.replace(/\.md$/, '.html');
    writeFileSync(outputPath, fullHtml, 'utf-8');

    console.log(`Title: ${result.title}`);
    console.log(`Digest: ${result.digest}`);
    console.log(`Images: ${result.images.length}`);
    console.log(`Theme: ${opts.theme}`);
    console.log(`Output: ${outputPath}`);

    if (opts.open !== false) {
      const { default: open } = await import('open');
      await open(`file://${resolve(outputPath)}`);
      console.log('Opened in browser.');
    }
  });

program
  .command('publish')
  .description('Convert and publish as WeChat draft')
  .argument('<input>', 'Markdown file path')
  .option('--client <client>', 'Client key for history.yaml writeback')
  .option('-t, --theme <key>', 'Theme key')
  .option('--appid <id>', 'WeChat AppID')
  .option('--secret <key>', 'WeChat AppSecret')
  .option('--cover <path>', 'Cover image file path')
  .option('--title <text>', 'Override article title')
  .option('--author <name>', 'Article author')
  .option('--font <key>', 'Font: default, optima, serif', 'default')
  .option('--font-size <n>', 'Body font size (14-18)', '16')
  .option('--heading-size <key>', 'Heading size', 'standard')
  .option('--paragraph-spacing <key>', 'Paragraph spacing', 'normal')
  .option('--custom-theme <path>', 'Custom theme JSON file path')
  .action(async (input: string, opts) => {
    const cfg = loadConfig();
    const wechatCfg = (cfg.wechat as Record<string, string>) || {};
    const resolvedClient = opts.client || inferClientFromRuntimeArticlePath(input) || undefined;
    const clientStyle = loadClientStyle(resolvedClient);

    const appid = opts.appid || wechatCfg.appid;
    const secret = opts.secret || wechatCfg.secret;
    const themeKey = (opts.theme || (cfg.theme as string) || DEFAULT_THEME) as ThemeKey;
    const author = resolvePublishAuthor(opts.author, wechatCfg.author, clientStyle);

    if (!appid || !secret) {
      console.error('Error: --appid and --secret required (or set in config.yaml)');
      process.exit(1);
    }

    const converter = new WeChatConverter({
      themeKey,
      fontFamily: opts.font as FontFamily,
      fontSize: parseInt(opts.fontSize),
      headingSize: opts.headingSize as HeadingSize,
      paragraphSpacing: opts.paragraphSpacing as ParagraphSpacing,
      ...(opts.customTheme ? { customTheme: loadCustomTheme(opts.customTheme) } : {}),
    });

    const result = converter.convertFile(input);

    console.log(`Title: ${result.title}`);
    console.log(`Digest: ${result.digest}`);
    console.log(`Images found: ${result.images.length}`);
    console.log(`Theme: ${themeKey}`);

    const token = await getAccessToken(appid, secret);
    console.log('Access token obtained.');

    let html = result.html;
    const mdDir = dirname(resolve(input));

    for (const imgSrc of result.images) {
      if (imgSrc.startsWith('http://') || imgSrc.startsWith('https://')) {
        console.log(`Skipping remote image: ${imgSrc}`);
        continue;
      }

      let imgPath = resolve(imgSrc);
      if (!existsSync(imgPath)) {
        imgPath = join(mdDir, imgSrc);
      }

      if (existsSync(imgPath)) {
        console.log(`Uploading image: ${imgSrc}`);
        const wechatUrl = await uploadImage(token, imgPath);
        html = html.replace(imgSrc, wechatUrl);
        console.log(`  -> ${wechatUrl}`);
      } else {
        console.log(`Warning: image not found: ${imgSrc}`);
      }
    }

    let thumbMediaId: string | undefined;
    let tempCoverPath: string | undefined;
    const coverPath = await resolveCoverPath(opts.cover, result.images, mdDir);
    if (coverPath) {
      console.log(`Uploading cover: ${coverPath}`);
      thumbMediaId = await uploadThumb(token, coverPath);
      console.log(`  -> media_id: ${thumbMediaId}`);
      if (!opts.cover && (coverPath.startsWith(tmpdir()) || coverPath.includes('/ls-wechat-cover-'))) {
        tempCoverPath = coverPath;
      }
    }

    const title = opts.title || result.title || input.replace(/\.md$/, '');
    try {
      const draft = await createDraft({
        accessToken: token,
        title,
        html,
        digest: result.digest,
        thumbMediaId,
        author,
      });

      console.log(`\nDraft created! media_id: ${draft.mediaId}`);

      const historyResult = recordPublishHistory({
        client: resolvedClient,
        inputPath: input,
        title,
        digest: result.digest,
        mediaId: draft.mediaId,
        coverMediaId: thumbMediaId,
        author,
        theme: themeKey,
      });

      if (historyResult) {
        console.log(
          historyResult.created
            ? `History appended: ${historyResult.historyPath}`
            : `History updated: ${historyResult.historyPath}`,
        );
      } else {
        console.log('History skipped: could not infer client from article path.');
      }
    } finally {
      if (tempCoverPath) {
        await rm(dirname(tempCoverPath), { recursive: true, force: true }).catch(() => {});
      }
    }
  });

program
  .command('cover')
  .description('Generate a cover image from article markdown using cover_type × style')
  .argument('<input>', 'Markdown file path')
  .option('-o, --output <path>', 'Output cover image file path')
  .option('--client <name>', 'Client/output namespace', 'default')
  .option('--provider <name>', 'Image provider: gemini, openai, doubao, qwen')
  .option('--style <text>', 'Cover style direction or configured style key', 'follow article tone')
  .requiredOption('--type <key>', 'Explicit cover type: hero, conceptual, typography, metaphor, scene, minimal')
  .option('--color <hex>', 'Accent color used in prompts', DEFAULT_COLOR)
  .action(async (input: string, opts) => {
    const result = await generateArticleCover({
      input,
      output: opts.output,
      client: opts.client,
      provider: opts.provider,
      style: opts.style,
      type: opts.type,
      color: opts.color,
    });

    console.log(`Cover: ${result.outputPath}`);
    console.log(`Prompt: ${result.promptPath}`);
    console.log(`Cover type: ${result.coverType}`);
    if (result.styleKey) console.log(`Style key: ${result.styleKey}`);
  });

program
  .command('illustrate')
  .description('Generate inline images and inject them into Markdown')
  .argument('<input>', 'Markdown file path')
  .option('-o, --output <path>', 'Output Markdown file path')
  .option('--client <name>', 'Client/output namespace', 'default')
  .option('--provider <name>', 'Image provider: gemini, openai, doubao, qwen')
  .option('--style <text>', 'Image style direction', 'follow article tone')
  .requiredOption('--target <spec...>', 'Explicit inline targets in the form "<section heading>::<inlineType>"')
  .option('--color <hex>', 'Accent color used in prompts', DEFAULT_COLOR)
  .action(async (input: string, opts) => {
    const result = await illustrateMarkdown({
      input,
      output: opts.output,
      client: opts.client,
      provider: opts.provider,
      style: opts.style,
      color: opts.color,
      targets: parseIllustrationTargets(opts.target as string[]),
    });

    console.log(`Output: ${result.outputPath}`);
    console.log(`Outline: ${result.outlinePath}`);
    console.log(`Images inserted: ${result.imageCount}`);
    for (const target of result.targets) {
      console.log(`- ${target.heading} -> ${target.outputPath}`);
    }
  });

program
  .command('style-benchmark')
  .description('Generate benchmark cover/inline images across style and article-type matrices')
  .option('--styles <keys>', 'Comma-separated style keys')
  .option('--article-types <keys>', 'Comma-separated article type keys')
  .option('--provider <name>', 'Image provider: gemini, openai, doubao, qwen')
  .option('--output-dir <path>', 'Output benchmark root directory')
  .option('--color <hex>', 'Accent color for prompts', DEFAULT_COLOR)
  .option('--fail-fast', 'Stop on first failed cell')
  .option('--skip-summary', 'Do not write overview/scores/matrix files')
  .option('--skip-existing', 'Reuse existing images when files already exist')
  .option('--summary-only', 'Only generate overview/scores/matrix from existing files')
  .action(async opts => {
    const result = await runStyleBenchmark({
      provider: opts.provider,
      outputDir: opts.outputDir,
      styles: parseBenchmarkStyles(opts.styles),
      articleTypes: parseBenchmarkArticleTypes(opts.articleTypes),
      continueOnError: !opts.failFast,
      color: opts.color,
      skipSummary: opts.skipSummary,
      skipExisting: opts.skipExisting,
      summaryOnly: opts.summaryOnly,
    });

    console.log(`Output dir: ${result.outputDir}`);
    if (!opts.skipSummary) {
      console.log(`Overview: ${result.overviewPath}`);
      console.log(`Scores: ${result.scoresPath}`);
      console.log(`Matrix: ${result.matrixPath}`);
    }
    console.log(`Styles: ${result.styles.join(', ')}`);
    console.log(`Article types: ${result.articleTypes.join(', ')}`);
    console.log(`Cells: ${result.cells.length}`);
  });

program
  .command('editorial-qa')
  .description('Run shallow editorial auto-fix and write a quality report')
  .argument('<input>', 'Markdown file path')
  .option('--client <client>', 'Client key for bundle output when input is outside runtime output')
  .action(async (input: string, opts) => {
    const result = await runEditorialQa({
      input,
      client: opts.client,
    });

    console.log(`Title: ${result.title}`);
    console.log(`Archetype: ${result.archetype}`);
    console.log(`Output shape: ${result.outputShape}`);
    console.log(`Article: ${result.articlePath}`);
    console.log(`Quality report: ${result.reportPath}`);
    console.log(`Auto-fix changes: ${result.changes.length}`);
    console.log(`Warnings: ${result.warnings.length}`);
  });

program
  .command('themes')
  .description('List available themes')
  .action(() => {
    console.log('Available themes:\n');
    for (const t of listThemes()) {
      console.log(`  ${t.key.padEnd(16)} ${t.name}  (${t.description})`);
    }
  });

program
  .command('colors')
  .description('List preset colors')
  .action(() => {
    console.log('Preset colors:\n');
    for (const [name, hex] of Object.entries(listPresetColors())) {
      console.log(`  ${name.padEnd(20)} ${hex}`);
    }
    console.log('\nYou can also use any custom HEX color with --color.');
  });

program
  .command('theme-preview')
  .description('Generate previews for all built-in themes')
  .argument('<input>', 'Markdown file path')
  .option('--no-open', "Don't open browser")
  .option('--font <key>', 'Font', 'default')
  .option('--font-size <n>', 'Font size', '16')
  .action(async (input: string, opts) => {
    const themes = listThemes();

    for (const t of themes) {
      const converter = new WeChatConverter({
        themeKey: t.key,
        fontFamily: opts.font as FontFamily,
        fontSize: parseInt(opts.fontSize),
      });

      const result = converter.convertFile(input);
      const fullHtml = previewHtml(result.html, converter.getTheme(), buildPreviewBaseHref(input));

      const outputPath = input.replace(/\.md$/, `.${t.key}.html`);
      writeFileSync(outputPath, fullHtml, 'utf-8');
      console.log(`  ${t.key.padEnd(16)} -> ${outputPath}`);
    }

    if (opts.open !== false) {
      const firstOutput = input.replace(/\.md$/, `.${themes[0].key}.html`);
      const { default: open } = await import('open');
      await open(`file://${resolve(firstOutput)}`);
    }

    console.log(`\nGenerated ${themes.length} theme previews.`);
  });

program.parse();
