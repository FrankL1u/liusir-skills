import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';

import { createArticleBundlePaths } from './article-bundle.js';
import { resolveArticleMetadata } from './article-metadata.js';
import { generateImageToFile } from './image-gen.js';
import { buildInlineImagePrompt, loadClientImageSystem } from './image-style-system.js';

export interface IllustrateOptions {
  input: string;
  output?: string;
  provider?: string;
  style?: string;
  density?: 'minimal' | 'balanced' | 'per-section' | 'custom';
  maxImages?: number;
  color?: string;
  minSectionChars?: number;
  client?: string;
}

interface MarkdownSection {
  headingLine: string;
  headingText: string;
  contentLines: string[];
  startLine: number;
  charCount: number;
}

type ArticleContentType = 'technical' | 'tutorial' | 'methodology' | 'narrative';
type IllustrationPurpose = 'information' | 'visualization' | 'imagination';

interface IllustrationOutlineEntry {
  section: MarkdownSection;
  articleType: ArticleContentType;
  purpose: IllustrationPurpose;
  visualContent: string;
  outputPath: string;
  markdownPath: string;
  prompt: string;
  alt: string;
  inlineType?: string;
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
    purpose?: string;
    inlineType?: string;
    styleKey?: string;
  }>;
}

const DEFAULT_STYLE = 'follow article tone';
const DEFAULT_MAX_IMAGES = 3;
const DEFAULT_MIN_SECTION_CHARS = 220;
const CLOSING_HEADING_PATTERN = /(结语|结尾|总结|小结|尾声|后记|写在最后|最后|结论|cta|call to action)/i;
const OPENING_HEADING_PATTERN = /(开头|引子|前言|导语|背景|先说结论|为什么要聊)/i;
const KEY_SIGNAL_PATTERN = /(框架|结构|系统|模型|流程|步骤|工作流|对比|比较|差异|演化|阶段|趋势|能力|原则|方法|验证|反馈|闭环|关系|层|模块)/i;

function resolveDensitySettings(
  density: IllustrateOptions['density'],
  explicitMaxImages: number | undefined,
  explicitMinSectionChars: number | undefined,
  totalSections: number,
): { maxImages: number; minSectionChars: number } {
  if (density === 'custom') {
    return {
      maxImages: explicitMaxImages ?? DEFAULT_MAX_IMAGES,
      minSectionChars: explicitMinSectionChars ?? DEFAULT_MIN_SECTION_CHARS,
    };
  }

  if (density === 'minimal') {
    return {
      maxImages: explicitMaxImages ?? 2,
      minSectionChars: explicitMinSectionChars ?? 260,
    };
  }

  if (density === 'per-section') {
    const cappedSections = Math.max(1, Math.min(totalSections, 12));
    return {
      maxImages: explicitMaxImages ?? cappedSections,
      minSectionChars: explicitMinSectionChars ?? 140,
    };
  }

  return {
    maxImages: explicitMaxImages ?? DEFAULT_MAX_IMAGES,
    minSectionChars: explicitMinSectionChars ?? DEFAULT_MIN_SECTION_CHARS,
  };
}

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

function detectArticleContentType(articleTitle: string, sections: MarkdownSection[]): ArticleContentType {
  const haystack = `${articleTitle} ${sections.map(section => `${section.headingText} ${cleanText(section.contentLines.join(' '))}`).join(' ')}`.toLowerCase();

  if (/(教程|如何|怎么|步骤|实战|指南|搭建)/i.test(haystack)) return 'tutorial';
  if (/(框架|结构|系统|模型|方法|原则|工作流|架构)/i.test(haystack)) return 'methodology';
  if (/(我|复盘|经历|故事|7天|个人|一人公司|做成|收费)/i.test(haystack)) return 'narrative';
  return 'technical';
}

function inferIllustrationPurpose(section: MarkdownSection, articleType: ArticleContentType): IllustrationPurpose {
  const haystack = `${section.headingText} ${cleanText(section.contentLines.join(' '))}`.toLowerCase();

  if (/(流程|步骤|工作流|链路|如何|怎么|框架|结构|模型|系统|关系|对比|比较|差异|阶段|演化)/i.test(haystack)) {
    return 'visualization';
  }

  if (/(故事|场景|经历|复盘|工作台|桌面|一天|个人)/i.test(haystack) || articleType === 'narrative') {
    return 'imagination';
  }

  return 'information';
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
      charCount: text.length,
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

function scoreOutlineCandidate(
  section: MarkdownSection,
  index: number,
  total: number,
  purpose: IllustrationPurpose,
): number {
  const haystack = `${section.headingText} ${cleanText(section.contentLines.join(' '))}`;
  let score = 0;

  score += Math.min(section.charCount, 420);
  if (purpose === 'visualization') score += 180;
  if (purpose === 'information') score += 110;
  if (purpose === 'imagination') score += 90;

  if (KEY_SIGNAL_PATTERN.test(haystack)) score += 140;
  if (/(数据|指标|图表|增长|看板|用户|数量|统计)/i.test(haystack)) score += 110;
  if (/(流程|步骤|链路|工作流|反馈|闭环)/i.test(haystack)) score += 130;
  if (/(对比|比较|差异|选择|优劣|vs)/i.test(haystack)) score += 120;
  if (/(故事|经历|场景|复盘|桌面|工作台)/i.test(haystack)) score += 70;

  if (index === 0 || OPENING_HEADING_PATTERN.test(section.headingText)) score -= 80;
  if (index === total - 1) score -= 100;
  if (CLOSING_HEADING_PATTERN.test(section.headingText)) score -= 500;

  return score;
}

function buildIllustrationOutline(
  sections: MarkdownSection[],
  articleTitle: string,
  opts: Required<Pick<IllustrateOptions, 'style' | 'color' | 'maxImages' | 'minSectionChars'>>,
  imageDir: string,
  markdownDir: string,
  client: string | undefined,
): IllustrationOutlineEntry[] {
  const imageSystem = loadClientImageSystem(client);
  const articleType = detectArticleContentType(articleTitle, sections);
  const eligible = sections
    .map((section, index) => {
      const purpose = inferIllustrationPurpose(section, articleType);
      const score = scoreOutlineCandidate(section, index, sections.length, purpose);
      const strongSemanticSignal = KEY_SIGNAL_PATTERN.test(`${section.headingText} ${cleanText(section.contentLines.join(' '))}`);
      return { section, purpose, score, strongSemanticSignal };
    })
    .filter(({ section, score, strongSemanticSignal }) =>
      score > 0 && (section.charCount >= opts.minSectionChars || strongSemanticSignal),
    )
    .sort((left, right) => right.score - left.score || left.section.startLine - right.section.startLine)
    .slice(0, opts.maxImages)
    .sort((left, right) => left.section.startLine - right.section.startLine);

  return eligible.map(({ section, purpose }, index) => {
    const fileName = `inline-${String(index + 1).padStart(2, '0')}.png`;
    const outputPath = join(imageDir, fileName);
    const markdownPath = relative(markdownDir, outputPath).replace(/\\/g, '/');
    const promptSpec = buildInlineImagePrompt({
      articleTitle,
      sectionHeading: section.headingText,
      contentLines: section.contentLines,
      styleText: opts.style,
      color: opts.color,
      imageSystem,
    });
    return {
      section,
      articleType,
      purpose,
      visualContent: buildVisualContent(section),
      outputPath,
      markdownPath,
      prompt: promptSpec.prompt,
      alt: section.headingText || `inline-${index + 1}`,
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
  const articleType = targets[0]?.articleType ?? 'technical';
  const style = targets[0]?.styleKey ?? 'custom';

  const parts: string[] = [
    '---',
    `title: "${title.replace(/"/g, '\\"')}"`,
    `article_type: ${articleType}`,
    `image_count: ${imageCount}`,
    `style: ${style}`,
    '---',
    '',
    `# Illustration Outline`,
    '',
  ];

  targets.forEach((target, index) => {
    parts.push(`## Illustration ${index + 1}`);
    parts.push('');
    parts.push(`**Position**: ${target.section.headingText}`);
    parts.push(`**Purpose**: ${target.purpose}`);
    parts.push(`**Type**: ${target.inlineType ?? 'framework'}`);
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
  const bundle = createArticleBundlePaths(opts.client ?? 'default', title);
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
  const densitySettings = resolveDensitySettings(
    opts.density,
    opts.maxImages,
    opts.minSectionChars,
    sections.length,
  );
  const targets = buildIllustrationOutline(sections, title, {
    style: opts.style ?? DEFAULT_STYLE,
    color: opts.color ?? '#3498db',
    maxImages: densitySettings.maxImages,
    minSectionChars: densitySettings.minSectionChars,
  }, imageDir, dirname(outputPath), opts.client);

  if (!targets.length) {
    throw new Error('没有找到适合插图的小节。请降低 --min-section-chars 或补充更多二级/三级标题。');
  }

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
      purpose: target.purpose,
      inlineType: target.inlineType,
      styleKey: target.styleKey ?? undefined,
    })),
  };
}
