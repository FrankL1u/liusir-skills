import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';

import { resolveArticleBundlePathsForInput } from './article-bundle.js';
import { resolveArticleMetadata } from './article-metadata.js';
import { generateImageToFile } from './image-gen.js';
import { buildInlineImagePrompt, loadClientImageSystem, type InlineImageType } from './image-style-system.js';

export interface IllustrateTargetInput {
  heading: string;
  inlineType: string;
  alt?: string;
}

export interface IllustrateOptions {
  input: string;
  output?: string;
  provider?: string;
  style?: string;
  color?: string;
  client?: string;
  targets?: IllustrateTargetInput[];
}

interface MarkdownSection {
  headingLine: string;
  headingText: string;
  contentLines: string[];
  startLine: number;
}

interface IllustrationOutlineEntry {
  section: MarkdownSection;
  visualContent: string;
  outputPath: string;
  markdownPath: string;
  prompt: string;
  alt: string;
  inlineType: InlineImageType;
  styleKey?: string | null;
}

export interface IllustrateResult {
  outputPath: string;
  outlinePath: string;
  imageCount: number;
  imagePaths: string[];
  targets: Array<{
    heading: string;
    prompt: string;
    outputPath: string;
    inlineType?: string;
    styleKey?: string;
  }>;
}

const DEFAULT_STYLE = 'follow article tone';

function extractTitle(text: string, inputPath: string): string {
  const title = resolveArticleMetadata(text).title;
  if (title) return title;
  return basename(inputPath, extname(inputPath));
}

function cleanText(text: string): string {
  return text
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[[^\]]+]\([^)]+\)/g, ' ')
    .replace(/[*_`>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildVisualContent(section: MarkdownSection): string {
  const summary = cleanText(section.contentLines.join(' '));
  if (!summary) return section.headingText;
  return `${section.headingText}: ${summary.slice(0, 180)}`;
}

function splitSections(lines: string[]): MarkdownSection[] {
  const sections: MarkdownSection[] = [];
  let currentHeadingLine = '';
  let currentHeadingText = '';
  let currentLines: string[] = [];
  let startLine = 0;

  const flush = () => {
    const text = cleanText(currentLines.join('\n'));
    if (!currentHeadingLine || !text) return;
    sections.push({
      headingLine: currentHeadingLine,
      headingText: currentHeadingText,
      contentLines: [...currentLines],
      startLine,
    });
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (/^##{1,2}\s+/.test(trimmed)) {
      flush();
      currentHeadingLine = line;
      currentHeadingText = trimmed.replace(/^##{1,2}\s+/, '').trim();
      currentLines = [];
      startLine = index;
      return;
    }

    if (!currentHeadingLine) return;
    currentLines.push(line);
  });

  flush();
  return sections;
}

function resolveExplicitTargets(
  sections: MarkdownSection[],
  articleTitle: string,
  explicitTargets: IllustrateTargetInput[] | undefined,
  opts: Required<Pick<IllustrateOptions, 'style' | 'color'>>,
  imageDir: string,
  markdownDir: string,
  client: string | undefined,
): IllustrationOutlineEntry[] {
  if (!explicitTargets?.length) {
    throw new Error('Explicit inline targets are required. Pass --target "<section heading>::<inlineType>" and let the agent choose them from the references.');
  }

  const imageSystem = loadClientImageSystem(client);
  const usedSectionIndexes = new Set<number>();

  return explicitTargets.map((target, index) => {
    const expectedHeading = target.heading.trim();
    if (!expectedHeading) {
      throw new Error(`Inline target ${index + 1} is missing a section heading.`);
    }

    const sectionIndex = sections.findIndex((section, candidateIndex) => (
      !usedSectionIndexes.has(candidateIndex) && section.headingText === expectedHeading
    ));

    if (sectionIndex < 0) {
      throw new Error(`Inline target section not found: ${expectedHeading}`);
    }

    usedSectionIndexes.add(sectionIndex);
    const section = sections[sectionIndex]!;
    const fileName = `inline-${String(index + 1).padStart(2, '0')}.png`;
    const outputPath = join(imageDir, fileName);
    const markdownPath = relative(markdownDir, outputPath).replace(/\\/g, '/');
    const promptSpec = buildInlineImagePrompt({
      articleTitle,
      sectionHeading: section.headingText,
      contentLines: section.contentLines,
      inlineType: target.inlineType,
      styleText: opts.style,
      color: opts.color,
      imageSystem,
    });

    return {
      section,
      visualContent: buildVisualContent(section),
      outputPath,
      markdownPath,
      prompt: promptSpec.prompt,
      alt: target.alt?.trim() || section.headingText || `inline-${index + 1}`,
      inlineType: promptSpec.inlineType,
      styleKey: promptSpec.styleKey,
    };
  });
}

function injectImages(lines: string[], targets: IllustrationOutlineEntry[]): string {
  const insertions = new Map<number, string[]>();
  for (const target of targets) {
    insertions.set(target.section.startLine, [
      '',
      `![${target.alt}](${target.markdownPath})`,
      '',
    ]);
  }

  const output: string[] = [];
  lines.forEach((line, index) => {
    output.push(line);
    const addition = insertions.get(index);
    if (addition) output.push(...addition);
  });

  return `${output.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}

function resolveOutlinePath(outputPath: string, bundleOutlinePath: string, usingBundleDefault: boolean): string {
  if (usingBundleDefault) return bundleOutlinePath;
  return join(dirname(outputPath), `${basename(outputPath, extname(outputPath))}.outline.md`);
}

function renderOutlineMarkdown(title: string, targets: IllustrationOutlineEntry[]): string {
  const imageCount = targets.length;
  const style = targets[0]?.styleKey ?? 'custom';

  const parts: string[] = [
    '---',
    `title: "${title.replace(/"/g, '\\"')}"`,
    `image_count: ${imageCount}`,
    `style: ${style}`,
    '---',
    '',
    '# Illustration Outline',
    '',
  ];

  targets.forEach((target, index) => {
    parts.push(`## Illustration ${index + 1}`);
    parts.push('');
    parts.push(`**Position**: ${target.section.headingText}`);
    parts.push(`**Type**: ${target.inlineType}`);
    parts.push(`**Visual Content**: ${target.visualContent}`);
    parts.push(`**Filename**: ${basename(target.outputPath)}`);
    parts.push('');
  });

  return `${parts.join('\n')}\n`;
}

export async function illustrateMarkdown(opts: IllustrateOptions): Promise<IllustrateResult> {
  const inputPath = resolve(opts.input);
  const rawText = readFileSync(inputPath, 'utf-8');
  const lines = rawText.split(/\r?\n/);
  const title = extractTitle(rawText, inputPath);
  const bundle = resolveArticleBundlePathsForInput({
    inputPath,
    title,
    client: opts.client,
  });
  const outputPath = resolve(opts.output ?? bundle.articlePath);
  const usingBundleDefault = !opts.output;
  const imageDir = opts.output
    ? join(dirname(outputPath), `${basename(outputPath, extname(outputPath))}.assets`)
    : bundle.assetsDir;
  const promptsDir = opts.output
    ? join(dirname(outputPath), `${basename(outputPath, extname(outputPath))}.prompts`)
    : bundle.promptsDir;
  const outlinePath = resolveOutlinePath(outputPath, join(bundle.bundleDir, 'outline.md'), usingBundleDefault);
  mkdirSync(imageDir, { recursive: true });
  mkdirSync(promptsDir, { recursive: true });

  const sections = splitSections(lines);
  const targets = resolveExplicitTargets(
    sections,
    title,
    opts.targets,
    {
      style: opts.style ?? DEFAULT_STYLE,
      color: opts.color ?? '#3498db',
    },
    imageDir,
    dirname(outputPath),
    opts.client,
  );

  writeFileSync(outlinePath, renderOutlineMarkdown(title, targets), 'utf-8');

  for (const [index, target] of targets.entries()) {
    writeFileSync(join(promptsDir, `inline-${String(index + 1).padStart(2, '0')}.prompt.txt`), `${target.prompt}\n`, 'utf-8');
    const result = await generateImageToFile({
      prompt: target.prompt,
      output: target.outputPath,
      size: 'article',
      provider: opts.provider,
      fallbackCover: false,
      color: opts.color ?? '#3498db',
      mood: '',
    });
    if (result.status !== 'ok') {
      throw new Error(`正文图生成失败: ${String(result.message ?? result.status ?? 'unknown error')}`);
    }
  }

  const illustratedMarkdown = injectImages(lines, targets);
  writeFileSync(outputPath, illustratedMarkdown, 'utf-8');

  return {
    outputPath,
    outlinePath,
    imageCount: targets.length,
    imagePaths: targets.map(target => target.outputPath),
    targets: targets.map(target => ({
      heading: target.section.headingText,
      prompt: target.prompt,
      outputPath: target.outputPath,
      inlineType: target.inlineType,
      styleKey: target.styleKey ?? undefined,
    })),
  };
}
