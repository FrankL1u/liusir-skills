import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';

import { createArticleBundlePaths } from './article-bundle.js';
import { resolveArticleMetadata } from './article-metadata.js';
import { inferClientFromRuntimeArticlePath } from './runtime-paths.js';

export type ArticleArchetype =
  | 'investigation'
  | 'product_experience'
  | 'phenomenon_analysis'
  | 'tool_share'
  | 'methodology';

export type OutputShape = 'immersive_longform' | 'structured_longform';

export interface EditorialInference {
  archetype: ArticleArchetype;
  outputShape: OutputShape;
  scores: Record<ArticleArchetype, number>;
}

export interface AutoFixResult {
  content: string;
  changes: string[];
  warnings: string[];
}

export interface EditorialQaOptions {
  input: string;
  client?: string;
}

export interface EditorialQaResult {
  articlePath: string;
  reportPath: string;
  title: string;
  archetype: ArticleArchetype;
  outputShape: OutputShape;
  changes: string[];
  warnings: string[];
}

interface SplitMarkdown {
  frontmatter: string;
  content: string;
}

interface QaCounts {
  bannedLexicalHits: number;
  bannedStructuralHits: number;
  hypotheticalHits: number;
  genericToolHits: number;
}

interface QaSignals {
  openingPass: boolean;
  rhythmPass: boolean;
  transitionPass: boolean;
  voicePass: boolean;
  supportPass: boolean;
  empathyPass: boolean;
  escalationPass: boolean;
  warmthPass: boolean;
  posturePass: boolean;
  flowPass: boolean;
  shapePass: boolean;
  archetypePass: boolean;
}

const KNOWN_TOOLS = [
  'Claude Code',
  'Claude',
  'Codex',
  'Cursor',
  'ChatGPT',
  'OpenAI',
  'GPT-5',
  'DeepSeek',
  'Gemini',
  'Qwen',
  'OpenClaw',
  'Clawbot',
  'Seedance',
  'Doubao',
  'Midjourney',
];

const BANNED_LEXICAL_PATTERNS = [
  /值得注意的是[，,]?/g,
  /不难发现[，,]?/g,
  /综上所述[，,]?/g,
  /总的来说[，,]?/g,
  /总而言之[，,]?/g,
  /让我们来看看/g,
  /接下来让我们/g,
  /首先[，,]?/g,
  /其次[，,]?/g,
  /最后[，,]?/g,
  /随着AI的发展[，,]?/g,
  /随着技术的不断进步[，,]?/g,
];

const HYPOTHETICAL_PATTERNS = [
  /比如有一次/g,
  /我举个例子[。.]?\s*有一次/g,
  /假设有一天/g,
  /假设你有一天/g,
];

const GENERIC_TOOL_PATTERNS = [
  /AI工具/g,
  /某个模型/g,
  /相关技术/g,
];

const STRUCTURAL_PATTERNS = [
  /接下来让我们/g,
  /让我们来看看/g,
  /首先[，,]?/g,
  /其次[，,]?/g,
  /最后[，,]?/g,
];

function splitFrontmatter(text: string): SplitMarkdown {
  if (!text.startsWith('---\n')) {
    return { frontmatter: '', content: text };
  }

  const end = text.indexOf('\n---', 4);
  if (end < 0) {
    return { frontmatter: '', content: text };
  }

  const boundaryEnd = text.indexOf('\n', end + 4);
  const contentStart = boundaryEnd >= 0 ? boundaryEnd + 1 : text.length;
  return {
    frontmatter: text.slice(0, contentStart),
    content: text.slice(contentStart),
  };
}

function joinMarkdown(parts: SplitMarkdown): string {
  const content = parts.content.trimEnd();
  if (!parts.frontmatter) return `${content}\n`;
  return `${parts.frontmatter}${content}\n`;
}

function cleanPlainText(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[[^\]]+]\([^)]+\)/g, ' ')
    .replace(/^#+\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function countMatches(text: string, patterns: RegExp[]): number {
  return patterns.reduce((total, pattern) => total + (text.match(pattern)?.length ?? 0), 0);
}

function detectConcreteTools(text: string): string[] {
  return KNOWN_TOOLS.filter(tool => text.includes(tool));
}

function mapShape(archetype: ArticleArchetype): OutputShape {
  if (archetype === 'tool_share' || archetype === 'methodology') {
    return 'structured_longform';
  }
  return 'immersive_longform';
}

export function inferArticleArchetype(markdownText: string): EditorialInference {
  const { content } = splitFrontmatter(markdownText);
  const text = cleanPlainText(content);
  const scores: Record<ArticleArchetype, number> = {
    investigation: 0,
    product_experience: 0,
    phenomenon_analysis: 0,
    tool_share: 0,
    methodology: 0,
  };

  if (/(我买了|我下单|我注册|亲手|调查|实验|上门|踩坑|我测了|我试了)/.test(text)) {
    scores.investigation += 3;
  }
  if (/(体验|上手|功能|版本|评测|开箱|跟我一起|使用场景|对比)/.test(text)) {
    scores.product_experience += 3;
  }
  if (/(刷屏|为什么会火|背后|现象|追下去|真正好奇的不是|这张图)/.test(text)) {
    scores.phenomenon_analysis += 3;
  }
  if (/(Prompt|提示词|工作流|模板|工具分享|推荐一个|神器)/i.test(text)) {
    scores.tool_share += 3;
  }
  if (/(经验|方法论|步骤|建议|清单|今天就可以|学习曲线|失败点|一开始可能会)/.test(text)) {
    scores.methodology += 3;
  }

  const h2Lines = content.split(/\r?\n/).filter(line => /^##\s+/.test(line.trim()));
  if (h2Lines.some(line => /第[一二三四五六七八九十0-9]/.test(line))) {
    scores.methodology += 2;
  }
  if (h2Lines.length >= 2) {
    scores.methodology += 1;
    scores.tool_share += 1;
  }

  const priority: ArticleArchetype[] = [
    'methodology',
    'investigation',
    'phenomenon_analysis',
    'product_experience',
    'tool_share',
  ];

  let archetype: ArticleArchetype = 'phenomenon_analysis';
  let maxScore = -1;
  for (const candidate of priority) {
    const score = scores[candidate];
    if (score > maxScore) {
      maxScore = score;
      archetype = candidate;
    }
  }

  if (maxScore <= 0) {
    archetype = /工具|Prompt|工作流/i.test(text) ? 'tool_share' : 'phenomenon_analysis';
  }

  return {
    archetype,
    outputShape: mapShape(archetype),
    scores,
  };
}

function rewriteHypotheticalLines(content: string) {
  const lines = content.split(/\r?\n/);
  const warnings: string[] = [];
  const changes: string[] = [];

  const rewritten = lines.map(line => {
    if (/^\s*#/.test(line) || !HYPOTHETICAL_PATTERNS.some(pattern => pattern.test(line))) {
      return line;
    }

    warnings.push('存在假设性例子，已改成未亲测说明，后续建议换成真实场景。');
    changes.push('将假设性例子改为明确的未亲测说明。');

    return line
      .replace(/我举个例子[。.]?\s*有一次/g, '如果只拿假设来解释，这里还没有一手验证。')
      .replace(/比如有一次/g, '如果只拿假设来解释，这里还没有一手验证。')
      .replace(/假设有一天/g, '如果只拿假设来解释，这里还没有一手验证。')
      .replace(/假设你有一天/g, '如果只拿假设来解释，这里还没有一手验证。');
  });

  return {
    content: rewritten.join('\n'),
    warnings,
    changes,
  };
}

export function autoFixEditorialIssues(markdownText: string): AutoFixResult {
  const parts = splitFrontmatter(markdownText);
  let content = parts.content;
  const changes: string[] = [];
  const warnings: string[] = [];

  for (const pattern of BANNED_LEXICAL_PATTERNS) {
    if (!pattern.test(content)) continue;
    content = content.replace(pattern, '');
    changes.push(`移除机械表达：${pattern.source}`);
  }

  const concreteTools = detectConcreteTools(content);
  const replacementTool = concreteTools[0];
  for (const pattern of GENERIC_TOOL_PATTERNS) {
    if (!pattern.test(content)) continue;
    if (replacementTool) {
      content = content.replace(pattern, `${replacementTool} 这类工具`);
      changes.push(`用具体工具名替换空泛表述：${pattern.source} -> ${replacementTool}`);
    } else {
      warnings.push(`仍存在空泛工具名：${pattern.source}`);
    }
  }

  const hypotheticalRewrite = rewriteHypotheticalLines(content);
  content = hypotheticalRewrite.content;
  warnings.push(...hypotheticalRewrite.warnings);
  changes.push(...hypotheticalRewrite.changes);

  const triadMarkers = content.match(/(^|\n)([^\n]+)[。！？]\n([^\n]+)[。！？]\n([^\n]+)[。！？]/g) ?? [];
  if (triadMarkers.length > 0) {
    warnings.push('存在过于工整的连续三句结构，建议手动打散节奏。');
  }

  const repeatedLines = content
    .split(/\r?\n/)
    .filter(line => /^(还有|同时|另外)/.test(line.trim()));
  if (repeatedLines.length >= 3) {
    warnings.push('存在连续罗列式段落，建议补一个主线回扣句。');
  }

  content = content
    .replace(/[ \t]+$/gm, '')
    .replace(/^\s*[，,]\s*/gm, '')
    .replace(/[，,]{2,}/g, '，')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    content: joinMarkdown({ frontmatter: parts.frontmatter, content }),
    changes,
    warnings,
  };
}

function countWords(markdownText: string): number {
  const { content } = splitFrontmatter(markdownText);
  return cleanPlainText(content).length;
}

function detectSignals(markdownText: string, outputShape: OutputShape): QaSignals {
  const { content } = splitFrontmatter(markdownText);
  const metadata = resolveArticleMetadata(markdownText);
  const paragraphs = content
    .split(/\n\s*\n/)
    .map(paragraph => cleanPlainText(paragraph))
    .filter(paragraph => Boolean(paragraph) && paragraph !== metadata.title);
  const firstParagraph = paragraphs[0] ?? '';
  const paragraphLengths = paragraphs.map(paragraph => paragraph.length);
  const maxParagraphLength = paragraphLengths.length ? Math.max(...paragraphLengths) : 0;
  const sceneOpening = /(最近|今天|昨天|上周|上个月|这两天|凌晨|周末|刷到|看到|我买了|我试了)/.test(firstParagraph);
  const confessionOpening = /(写这篇文章之前|我删掉了|我承认|我以前一直|我后来才意识到|不是因为.+是因为)/.test(firstParagraph);
  const dataOpening = /(\d{2,}|%|万|亿|次)/.test(firstParagraph)
    && /(相当于|也就是说|这意味着|但)/.test(firstParagraph);
  const challengeOpening = /^(你以为|如果你还觉得|我要先说一句不好听的)/.test(firstParagraph);
  const contradictionOpening = /(一边.+一边|原本以为.+实际上|两个事实|两个同时成立的事实)/.test(firstParagraph);
  const openingPass = !/^(在当今|随着|什么是)/.test(firstParagraph)
    && (sceneOpening || confessionOpening || dataOpening || challengeOpening || contradictionOpening);
  const questionTurns = /(为什么|怎么会|但真正让我好奇|听着很难理解对吧|你可能会问)/.test(content);
  const transitionMarkers = /(回到|顺着上面的|说到这个|但真正|不过|问题是|我真正好奇的不是)/.test(content);
  const privateVoice = /(我觉得|我真正好奇|我还是|说实话|我自己|我更愿意)/.test(content);
  const support = /(\d{2,}|《[^》]+》|上个月|去年|具体|比如Claude Code|DeepSeek|Gemini|Codex)/.test(content);
  const empathy = /(我理解这种感觉|你不是|你就是一个普通的|我也经历过)/.test(content);
  const escalation = /(历史|十年前|1880年代|哲学|文化|像当年|让我想到)/.test(content);
  const warmth = /(愣住了|兴奋|震撼|无语|鼻子一酸|懵|爽|困惑)/.test(content);
  const posture = !/(综上所述|下面我来|首先需要了解)/.test(content);
  const flowPass = maxParagraphLength <= (outputShape === 'immersive_longform' ? 220 : 180);
  const h2Count = content.split(/\r?\n/).filter(line => /^##\s+/.test(line.trim())).length;
  const shapePass = outputShape === 'immersive_longform'
    ? h2Count <= 2
    : h2Count >= 2 && h2Count <= 5;
  const archetypePass = outputShape === 'immersive_longform'
    ? openingPass
      && /(回到|问题是|我真正好奇的不是|顺着这个问题)/.test(content)
    : /(建议|步骤|清单|今天就可以|先把|下一步)/.test(content)
      && /(学习曲线|失败点|一开始|踩坑|没跑通)/.test(content);
  const distinctLengths = new Set(paragraphLengths.map(length => Math.round(length / 40))).size;

  return {
    openingPass,
    rhythmPass: distinctLengths >= 2 || paragraphs.some(paragraph => paragraph.length <= 24),
    transitionPass: questionTurns || transitionMarkers,
    voicePass: privateVoice,
    supportPass: support,
    empathyPass: empathy,
    escalationPass: escalation,
    warmthPass: warmth,
    posturePass: posture,
    flowPass,
    shapePass,
    archetypePass,
  };
}

function buildQualityReport(input: {
  title: string;
  archetype: ArticleArchetype;
  outputShape: OutputShape;
  content: string;
  changes: string[];
  warnings: string[];
}): string {
  const counts: QaCounts = {
    bannedLexicalHits: countMatches(input.content, BANNED_LEXICAL_PATTERNS),
    bannedStructuralHits: countMatches(input.content, STRUCTURAL_PATTERNS),
    hypotheticalHits: countMatches(input.content, HYPOTHETICAL_PATTERNS),
    genericToolHits: countMatches(input.content, GENERIC_TOOL_PATTERNS),
  };
  const signals = detectSignals(input.content, input.outputShape);
  const wordCount = countWords(input.content);
  const l1Pass = counts.bannedLexicalHits === 0
    && counts.bannedStructuralHits === 0
    && counts.hypotheticalHits === 0
    && counts.genericToolHits === 0;
  const l2Pass = signals.openingPass
    && signals.rhythmPass
    && signals.transitionPass
    && signals.voicePass
    && signals.shapePass;
  const l3Pass = signals.supportPass
    && signals.empathyPass
    && signals.escalationPass
    && signals.archetypePass;
  const l4Pass = signals.warmthPass && signals.posturePass && signals.flowPass;
  const overall = [l1Pass, l2Pass, l3Pass, l4Pass].every(Boolean);
  const priorities = [
    !signals.openingPass ? '补强开头抓力，避免抽象起手。' : null,
    !signals.shapePass ? '当前结构与输出 shape 不一致，需调整 H2 数量和段落组织。' : null,
    !signals.archetypePass ? '当前原型要素不完整，补齐主线回扣、行动建议或学习曲线。' : null,
    !signals.supportPass ? '为核心判断补一个具体数据、案例或已发生的场景。' : null,
    input.warnings.length > 0 ? input.warnings[0] : null,
  ].filter(Boolean) as string[];

  return [
    '---',
    `title: "${input.title.replace(/"/g, '\\"')}"`,
    `article_archetype: ${input.archetype}`,
    `output_shape: ${input.outputShape}`,
    `word_count: ${wordCount}`,
    `auto_fix_changes: ${input.changes.length}`,
    `warnings: ${input.warnings.length}`,
    '---',
    '',
    '## 质检报告',
    '',
    `- title: ${input.title}`,
    `- article_archetype: ${input.archetype}`,
    `- output_shape: ${input.outputShape}`,
    `- word_count: ${wordCount}`,
    '',
    `**L1 硬性规则** ${l1Pass ? '✅' : '❌'}`,
    `- 禁用词：${counts.bannedLexicalHits} 处残留`,
    `- 结构套话：${counts.bannedStructuralHits} 处残留`,
    `- 假设性例子：${counts.hypotheticalHits} 处`,
    `- 空泛工具名：${counts.genericToolHits} 处残留`,
    '',
    `**L2 风格一致性** ${l2Pass ? '✅' : '❌'}`,
    `- 开头：${signals.openingPass ? '✅' : '❌'}`,
    `- 节奏：${signals.rhythmPass ? '✅' : '❌'}`,
    `- 转场：${signals.transitionPass ? '✅' : '❌'}`,
    `- 私人声音：${signals.voicePass ? '✅' : '❌'}`,
    `- shape 一致性：${signals.shapePass ? '✅' : '❌'}`,
    '',
    `**L3 内容质量** ${l3Pass ? '✅' : '❌'}`,
    `- 观点支撑：${signals.supportPass ? '✅' : '❌'}`,
    `- 同理心：${signals.empathyPass ? '✅' : '❌'}`,
    `- 文化/历史升维：${signals.escalationPass ? '✅' : '❌'}`,
    `- 原型专项检查：${signals.archetypePass ? '✅' : '❌'}`,
    '',
    `**L4 活人感** ${l4Pass ? '✅' : '❌'}`,
    `- 温度感：${signals.warmthPass ? '✅' : '❌'}`,
    `- 姿态：${signals.posturePass ? '✅' : '❌'}`,
    `- 心流：${signals.flowPass ? '✅' : '❌'}`,
    '',
    '**自动修复**',
    ...(input.changes.length ? input.changes.map(change => `- ${change}`) : ['- 无']),
    '',
    '**待人工确认**',
    ...(input.warnings.length ? input.warnings.map(warning => `- ${warning}`) : ['- 无']),
    '',
    `**总评**：${overall ? '4 层全部通过' : '存在需要返工的层级'}`,
    `**修复优先级**：${priorities.length ? priorities.join(' / ') : '无高优先级阻塞项'}`,
    '',
  ].join('\n');
}

function resolveOutputPaths(inputPath: string, clientOverride: string | undefined, title: string) {
  const absoluteInput = resolve(inputPath);
  const inferredClient = inferClientFromRuntimeArticlePath(absoluteInput);
  const client = clientOverride ?? inferredClient ?? 'default';

  if (inferredClient && basename(absoluteInput) === 'article.md') {
    return {
      client,
      articlePath: absoluteInput,
      reportPath: join(dirname(absoluteInput), 'quality-report.md'),
    };
  }

  const bundle = createArticleBundlePaths(client, title);
  return {
    client,
    articlePath: bundle.articlePath,
    reportPath: bundle.qualityReportPath,
  };
}

export async function runEditorialQa(options: EditorialQaOptions): Promise<EditorialQaResult> {
  const absoluteInput = resolve(options.input);
  const raw = readFileSync(absoluteInput, 'utf-8');
  const metadata = resolveArticleMetadata(raw);
  const title = metadata.title || basename(absoluteInput, extname(absoluteInput));
  const inference = inferArticleArchetype(raw);
  const fixed = autoFixEditorialIssues(raw);
  const { articlePath, reportPath } = resolveOutputPaths(absoluteInput, options.client, title);

  writeFileSync(articlePath, fixed.content, 'utf-8');
  writeFileSync(
    reportPath,
    buildQualityReport({
      title,
      archetype: inference.archetype,
      outputShape: inference.outputShape,
      content: fixed.content,
      changes: fixed.changes,
      warnings: fixed.warnings,
    }),
    'utf-8',
  );

  return {
    articlePath,
    reportPath,
    title,
    archetype: inference.archetype,
    outputShape: inference.outputShape,
    changes: fixed.changes,
    warnings: fixed.warnings,
  };
}
