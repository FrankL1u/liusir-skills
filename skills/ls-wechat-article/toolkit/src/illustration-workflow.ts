import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';

import { resolveArticleBundlePathsForInput } from './article-bundle.js';
import { resolveArticleMetadata } from './article-metadata.js';
import { generateImageToFile } from './image-gen.js';
import { buildInlineImagePrompt, loadClientImageSystem, type InlineImageType } from './image-style-system.js';

export interface IllustrateTargetInput {
  anchor?: string;
  heading?: string;
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

interface MarkdownParagraphBlock {
  sectionHeading: string;
  contentLines: string[];
  startLine: number;
  endLine: number;
  anchorText: string;
}

export interface ResolvedIllustrationTarget {
  kind: 'section' | 'paragraph';
  sectionHeading: string;
  positionLabel: string;
  contentLines: string[];
  insertAfterLine: number;
}

interface IllustrationOutlineEntry {
  target: ResolvedIllustrationTarget;
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

function normalizeMatchText(text: string): string {
  return cleanText(text)
    .toLowerCase()
    .replace(/[，。！？：；、“”"'（）()《》【】,.!?;:]/g, '')
    .replace(/\s+/g, '');
}

function buildVisualContent(target: ResolvedIllustrationTarget): string {
  const summary = cleanText(target.contentLines.join(' '));
  if (!summary) return target.positionLabel;
  return `${target.sectionHeading}: ${summary.slice(0, 180)}`;
}

function findLeadingFrontmatterEnd(lines: string[]): number {
  if (lines[0]?.trim() !== '---') return -1;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index]?.trim() === '---') return index;
  }
  return -1;
}

function resolveDocumentTitle(lines: string[], articleTitleHint?: string): string {
  if (articleTitleHint?.trim()) return articleTitleHint.trim();

  const frontmatterEnd = findLeadingFrontmatterEnd(lines);
  const startIndex = frontmatterEnd >= 0 ? frontmatterEnd + 1 : 0;
  for (let index = startIndex; index < lines.length; index += 1) {
    const trimmed = lines[index]?.trim() ?? '';
    if (/^#\s+/.test(trimmed)) {
      return trimmed.replace(/^#\s+/, '').trim();
    }
  }

  return '导语';
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

function splitParagraphBlocks(lines: string[], articleTitleHint?: string): MarkdownParagraphBlock[] {
  const blocks: MarkdownParagraphBlock[] = [];
  const documentTitle = resolveDocumentTitle(lines, articleTitleHint);
  const frontmatterEnd = findLeadingFrontmatterEnd(lines);
  const startIndex = frontmatterEnd >= 0 ? frontmatterEnd + 1 : 0;
  let currentSectionHeading = documentTitle;
  let currentLines: string[] = [];
  let blockStartLine = -1;
  let blockEndLine = -1;

  const flush = () => {
    const text = cleanText(currentLines.join('\n'));
    if (blockStartLine < 0 || !text) return;
    blocks.push({
      sectionHeading: currentSectionHeading,
      contentLines: [...currentLines],
      startLine: blockStartLine,
      endLine: blockEndLine,
      anchorText: text.slice(0, 80),
    });
    currentLines = [];
    blockStartLine = -1;
    blockEndLine = -1;
  };

  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const trimmed = line.trim();

    if (!trimmed) {
      flush();
      continue;
    }

    if (/^!\[[^\]]*]\([^)]+\)\s*$/.test(trimmed) || /^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flush();
      continue;
    }

    if (/^#{1,6}\s+/.test(trimmed)) {
      flush();
      const headingText = trimmed.replace(/^#{1,6}\s+/, '').trim();
      if (/^##{1,2}\s+/.test(trimmed)) {
        currentSectionHeading = headingText;
      } else if (/^#\s+/.test(trimmed)) {
        currentSectionHeading = headingText || documentTitle;
      }
      continue;
    }

    if (blockStartLine < 0) blockStartLine = index;
    blockEndLine = index;
    currentLines.push(line);
  }

  flush();

  return blocks;
}

function resolveTargetLocator(target: IllustrateTargetInput, index: number): string {
  const locator = target.anchor?.trim() || target.heading?.trim() || '';
  if (!locator) {
    throw new Error(`Inline target ${index + 1} is missing a position anchor.`);
  }
  return locator;
}

function createSectionTarget(section: MarkdownSection): ResolvedIllustrationTarget {
  return {
    kind: 'section',
    sectionHeading: section.headingText,
    positionLabel: section.headingText,
    contentLines: section.contentLines,
    insertAfterLine: section.startLine,
  };
}

function createParagraphTarget(block: MarkdownParagraphBlock): ResolvedIllustrationTarget {
  return {
    kind: 'paragraph',
    sectionHeading: block.sectionHeading,
    positionLabel: `${block.sectionHeading} / ${block.anchorText}`,
    contentLines: block.contentLines,
    insertAfterLine: block.endLine,
  };
}

function scoreParagraphMatch(locator: string, block: MarkdownParagraphBlock): number {
  const normalizedLocator = normalizeMatchText(locator);
  const normalizedAnchor = normalizeMatchText(block.anchorText);
  const normalizedContent = normalizeMatchText(block.contentLines.join(' '));

  if (!normalizedLocator || !normalizedContent) return 0;
  if (normalizedAnchor === normalizedLocator || normalizedContent === normalizedLocator) return 500;
  if (normalizedContent.startsWith(normalizedLocator)) return 420;
  if (normalizedAnchor.startsWith(normalizedLocator)) return 400;
  if (normalizedContent.includes(normalizedLocator)) return 320;
  if (normalizedAnchor.includes(normalizedLocator)) return 280;
  if (normalizedLocator.includes(normalizedAnchor) && normalizedAnchor.length >= 12) return 220;
  return 0;
}

export function resolveIllustrationTargets(
  lines: string[],
  explicitTargets: IllustrateTargetInput[] | undefined,
  articleTitleHint?: string,
): ResolvedIllustrationTarget[] {
  if (!explicitTargets?.length) {
    throw new Error('Explicit inline targets are required. Pass --target "<position anchor>::<inlineType>" and let the agent choose them from the references.');
  }

  const sections = splitSections(lines);
  const blocks = splitParagraphBlocks(lines, articleTitleHint);
  const usedKeys = new Set<string>();

  return explicitTargets.map((target, index) => {
    const locator = resolveTargetLocator(target, index);
    const normalizedLocator = normalizeMatchText(locator);

    const sectionIndex = sections.findIndex((section, candidateIndex) => (
      !usedKeys.has(`section:${candidateIndex}`) && normalizeMatchText(section.headingText) === normalizedLocator
    ));
    if (sectionIndex >= 0) {
      usedKeys.add(`section:${sectionIndex}`);
      return createSectionTarget(sections[sectionIndex]!);
    }

    const paragraphMatch = blocks
      .map((block, blockIndex) => ({
        block,
        blockIndex,
        score: usedKeys.has(`block:${blockIndex}`) ? 0 : scoreParagraphMatch(locator, block),
      }))
      .filter(candidate => candidate.score > 0)
      .sort((left, right) => right.score - left.score || left.block.startLine - right.block.startLine)[0];

    if (!paragraphMatch) {
      throw new Error(`Inline target position not found: ${locator}`);
    }

    usedKeys.add(`block:${paragraphMatch.blockIndex}`);
    return createParagraphTarget(paragraphMatch.block);
  });
}

function resolveExplicitTargets(
  lines: string[],
  articleTitle: string,
  explicitTargets: IllustrateTargetInput[] | undefined,
  opts: Required<Pick<IllustrateOptions, 'style' | 'color'>>,
  imageDir: string,
  markdownDir: string,
  client: string | undefined,
): IllustrationOutlineEntry[] {
  const imageSystem = loadClientImageSystem(client);
  const resolvedTargets = resolveIllustrationTargets(lines, explicitTargets, articleTitle);

  return resolvedTargets.map((resolvedTarget, index) => {
    const fileName = `inline-${String(index + 1).padStart(2, '0')}.png`;
    const outputPath = join(imageDir, fileName);
    const markdownPath = relative(markdownDir, outputPath).replace(/\\/g, '/');
    const promptSpec = buildInlineImagePrompt({
      articleTitle,
      sectionHeading: resolvedTarget.sectionHeading,
      contentLines: resolvedTarget.contentLines,
      inlineType: explicitTargets?.[index]?.inlineType,
      styleText: opts.style,
      color: opts.color,
      imageSystem,
    });

    return {
      target: resolvedTarget,
      visualContent: buildVisualContent(resolvedTarget),
      outputPath,
      markdownPath,
      prompt: promptSpec.prompt,
      alt: explicitTargets?.[index]?.alt?.trim() || resolvedTarget.positionLabel || `inline-${index + 1}`,
      inlineType: promptSpec.inlineType,
      styleKey: promptSpec.styleKey,
    };
  });
}

export function injectImagesAtResolvedTargets(
  lines: string[],
  targets: Array<ResolvedIllustrationTarget & { markdownPath: string; alt: string }>,
): string {
  const insertions = new Map<number, string[]>();
  for (const target of targets) {
    const existing = insertions.get(target.insertAfterLine) ?? [];
    insertions.set(target.insertAfterLine, [
      ...existing,
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
    parts.push(`**Position**: ${target.target.positionLabel}`);
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

  const targets = resolveExplicitTargets(
    lines,
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

  const illustratedMarkdown = injectImagesAtResolvedTargets(
    lines,
    targets.map(target => ({
      ...target.target,
      markdownPath: target.markdownPath,
      alt: target.alt,
    })),
  );
  writeFileSync(outputPath, illustratedMarkdown, 'utf-8');

  return {
    outputPath,
    outlinePath,
    imageCount: targets.length,
    imagePaths: targets.map(target => target.outputPath),
    targets: targets.map(target => ({
      heading: target.target.positionLabel,
      prompt: target.prompt,
      outputPath: target.outputPath,
      inlineType: target.inlineType,
      styleKey: target.styleKey ?? undefined,
    })),
  };
}
