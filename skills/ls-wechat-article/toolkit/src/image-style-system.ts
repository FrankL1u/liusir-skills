import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse as parseYaml } from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_DIR = resolve(__dirname, '../..');

export type InlineImageType =
  | 'infographic'
  | 'scene'
  | 'flowchart'
  | 'comparison'
  | 'framework'
  | 'timeline';

export type CoverImageType =
  | 'hero'
  | 'conceptual'
  | 'typography'
  | 'metaphor'
  | 'scene'
  | 'minimal';

export interface ClientImageStyleEntry {
  key: string;
  zh?: string;
  aliases?: string[];
  use_for_cover?: boolean;
  use_for_inline?: boolean;
  cover_types?: string[];
  inline_types?: string[];
  notes?: string;
}

export interface ClientImageSystem {
  subject_constraints?: string;
  visual_constraints?: string;
  defaults?: {
    cover_style?: string;
    inline_style?: string;
    cover_type?: string;
    inline_type_by_content?: Record<string, string>;
  };
  cover_types?: Array<{
    key: string;
    zh?: string;
    description?: string;
  }>;
  inline_types?: Array<{
    key: string;
    zh?: string;
    description?: string;
  }>;
  styles?: ClientImageStyleEntry[];
}

interface ClientStyleFile {
  image_system?: ClientImageSystem;
}

interface StylePromptProfile {
  sharedDirection: string;
  coverDirection: string;
  inlineDirection: string;
}

const STYLE_PROMPT_LIBRARY: Record<string, StylePromptProfile> = {
  notion: {
    sharedDirection: 'minimal hand-drawn note card, clean white background, thin lines, knowledge-sharing visual language',
    coverDirection: 'single hero concept with clean labels, startup knowledge card aesthetic, polished but simple',
    inlineDirection: 'section explanation visual, hand-drawn knowledge card, clear structure, light annotation',
  },
  warm: {
    sharedDirection: 'warm friendly visual style, soft edges, approachable composition, gentle and welcoming, symbolic or stylized subjects',
    coverDirection: 'friendly cover visual with emotional warmth and clear message, inviting and personal',
    inlineDirection: 'warm section illustration, gentle explanatory visual, relatable and easy to understand',
  },
  blueprint: {
    sharedDirection: 'technical blueprint aesthetic, structural lines, system diagram feeling, engineering clarity',
    coverDirection: 'architectural technical cover, bold structural metaphor, system design visual language',
    inlineDirection: 'technical section diagram, blueprint lines, architecture explanation, system relationships',
  },
  watercolor: {
    sharedDirection: 'watercolor illustration, soft pigment diffusion, organic shapes, artistic and warm',
    coverDirection: 'watercolor article cover, soft emotional focal point, artistic storytelling composition',
    inlineDirection: 'watercolor explanatory illustration, gentle educational tone, organic conceptual rendering',
  },
  editorial: {
    sharedDirection: 'editorial diagram style, off-white paper background, black outlines, teal and orange accents, structured explanatory visual',
    coverDirection: 'editorial magazine-style cover diagram, one strong framework metaphor, sharp explanatory composition',
    inlineDirection: 'editorial section diagram, concept visualization, relationship map, structured explainer graphic',
  },
  scientific: {
    sharedDirection: 'scientific diagram aesthetic, precise labels, measured structure, educational chart-like rendering',
    coverDirection: 'scientific conceptual cover, precise schematic metaphor, analytical and rigorous tone',
    inlineDirection: 'precise explanatory diagram, chart-like structure, rigorous educational visual',
  },
  'lofi-doodle': {
    sharedDirection: 'lofi doodle style, black sketch lines, rough paper texture, whiteboard thinking, casual ideation energy',
    coverDirection: 'single-page doodle cover, rough sketch concept, playful explanatory vibe',
    inlineDirection: 'rough doodle explainer, simple symbols and arrows, brainstorming note feeling',
  },
  'multi-panel-manga': {
    sharedDirection: 'multi-panel manga explainer, black and white comic screentones, expressive stylized manga characters, narrative progression',
    coverDirection: 'manga-style cover poster with a strong main scene, comic energy, title integrated into the composition',
    inlineDirection: 'four-panel or multi-panel explanatory manga, process storytelling, clear action progression',
  },
  'notebook-sketch': {
    sharedDirection: 'notebook sketch concept art, rough pen lines, notebook paper texture, invention sketch feel',
    coverDirection: 'notebook-style conceptual cover drawing, bold hand-drawn mechanical metaphor, sketchbook energy',
    inlineDirection: 'notebook concept sketch for a section, rough system drawing, handwritten-study vibe',
  },
  claymation: {
    sharedDirection: 'claymation stop-motion style, tactile clay texture, playful miniatures, rounded forms, vivid handmade world',
    coverDirection: 'claymation cover tableau, one central playful metaphor, tactile toy-like environment',
    inlineDirection: 'claymation explainer scene, miniature props and stylized toy-like characters, friendly tangible storytelling',
  },
};

const COVER_TYPE_DIRECTIONS: Record<CoverImageType, string> = {
  hero: 'single strong hero visual, one dominant focal subject, immediate thumbnail readability',
  conceptual: 'conceptual cover, one core abstract idea translated into a strong visual system',
  typography: 'title-led poster composition, short Chinese title text may appear as a designed visual element',
  metaphor: 'visual metaphor cover, objects or structures expressing the article argument symbolically',
  scene: 'single narrative scene cover, one readable work or life context that sets the article tone',
  minimal: 'minimal cover, distilled composition with only essential elements and generous whitespace',
};

const INLINE_TYPE_DIRECTIONS: Record<InlineImageType, string> = {
  infographic: 'data-rich infographic structure, modular visual blocks, information density with clear hierarchy',
  scene: 'single explanatory scene, contextual atmosphere, one readable moment inside the article',
  flowchart: 'workflow visualization, step-by-step process arrows, sequence and transitions clearly visible',
  comparison: 'side-by-side comparison layout, before-versus-after or option-versus-option structure',
  framework: 'conceptual framework diagram, system relationships, layered modules and mapped connections',
  timeline: 'timeline progression, milestones or stages unfolding along a time axis',
};

function cleanText(text: string): string {
  return text
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[[^\]]+]\([^)]+\)/g, ' ')
    .replace(/[*_`>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeStyleToken(value: string): string {
  return value.trim().toLowerCase();
}

function matchConfiguredStyle(
  styles: ClientImageStyleEntry[] | undefined,
  requestedStyle: string | undefined,
): ClientImageStyleEntry | null {
  if (!styles?.length || !requestedStyle?.trim()) return null;
  const requested = normalizeStyleToken(requestedStyle);
  for (const entry of styles) {
    const candidates = [entry.key, entry.zh ?? '', ...(entry.aliases ?? [])]
      .map(candidate => normalizeStyleToken(candidate))
      .filter(Boolean);
    if (candidates.includes(requested)) return entry;
  }
  return null;
}

function loadPublicImageSystem(): ClientImageSystem | null {
  const configPath = resolve(PROJECT_DIR, 'references', 'image-system.yaml');
  if (!existsSync(configPath)) return null;
  return (parseYaml(readFileSync(configPath, 'utf-8')) as ClientImageSystem | null) ?? null;
}

function mergeImageSystems(
  base: ClientImageSystem | null,
  override: ClientImageSystem | null,
): ClientImageSystem | null {
  if (!base && !override) return null;
  if (!base) return override;
  if (!override) return base;

  const mergedSubjectConstraints = [base.subject_constraints, override.subject_constraints]
    .filter(value => value && value.trim())
    .join('\n')
    .trim();

  const mergedVisualConstraints = [base.visual_constraints, override.visual_constraints]
    .filter(value => value && value.trim())
    .join('\n')
    .trim();

  return {
    subject_constraints: mergedSubjectConstraints || undefined,
    visual_constraints: mergedVisualConstraints || undefined,
    defaults: {
      ...(base.defaults ?? {}),
      ...(override.defaults ?? {}),
      inline_type_by_content: {
        ...(base.defaults?.inline_type_by_content ?? {}),
        ...(override.defaults?.inline_type_by_content ?? {}),
      },
    },
    cover_types: override.cover_types?.length ? override.cover_types : base.cover_types,
    inline_types: override.inline_types?.length ? override.inline_types : base.inline_types,
    styles: override.styles?.length ? override.styles : base.styles,
  };
}

export function loadClientImageSystem(client?: string): ClientImageSystem | null {
  const publicSystem = loadPublicImageSystem();
  if (!client || client === 'default') return publicSystem;

  const stylePath = resolve(PROJECT_DIR, 'clients', client, 'style.yaml');
  if (!existsSync(stylePath)) return publicSystem;
  const raw = parseYaml(readFileSync(stylePath, 'utf-8')) as ClientStyleFile | null;
  return mergeImageSystems(publicSystem, raw?.image_system ?? null);
}

export function resolveInlineStyleKey(
  imageSystem: ClientImageSystem | null,
  requestedStyle?: string,
): string | null {
  if (!imageSystem?.styles?.length) return null;

  const normalizedRequested = requestedStyle?.trim().toLowerCase();
  const defaults = imageSystem.defaults ?? {};

  if (!normalizedRequested || normalizedRequested === 'follow article tone') {
    return defaults.inline_style ?? null;
  }

  return matchConfiguredStyle(imageSystem.styles, requestedStyle)?.key ?? null;
}

export function resolveInlineStyleProfile(
  imageSystem: ClientImageSystem | null,
  requestedStyle?: string,
): { key: string | null; profile: StylePromptProfile | null; customStyleText: string | null } {
  const styleKey = resolveInlineStyleKey(imageSystem, requestedStyle);
  if (styleKey && STYLE_PROMPT_LIBRARY[styleKey]) {
    return { key: styleKey, profile: STYLE_PROMPT_LIBRARY[styleKey], customStyleText: null };
  }

  if (requestedStyle && requestedStyle.trim() && requestedStyle !== 'follow article tone') {
    return { key: null, profile: null, customStyleText: requestedStyle.trim() };
  }

  return { key: null, profile: null, customStyleText: null };
}

export function resolveCoverStyleKey(
  imageSystem: ClientImageSystem | null,
  requestedStyle?: string,
): string | null {
  if (!imageSystem?.styles?.length) return null;

  const normalizedRequested = requestedStyle?.trim().toLowerCase();
  const defaults = imageSystem.defaults ?? {};

  if (!normalizedRequested || normalizedRequested === 'follow article tone') {
    return defaults.cover_style ?? null;
  }

  return matchConfiguredStyle(imageSystem.styles, requestedStyle)?.key ?? null;
}

export function resolveCoverStyleProfile(
  imageSystem: ClientImageSystem | null,
  requestedStyle?: string,
): { key: string | null; profile: StylePromptProfile | null; customStyleText: string | null } {
  const styleKey = resolveCoverStyleKey(imageSystem, requestedStyle);
  if (styleKey && STYLE_PROMPT_LIBRARY[styleKey]) {
    return { key: styleKey, profile: STYLE_PROMPT_LIBRARY[styleKey], customStyleText: null };
  }

  if (requestedStyle && requestedStyle.trim() && requestedStyle !== 'follow article tone') {
    return { key: null, profile: null, customStyleText: requestedStyle.trim() };
  }

  return { key: null, profile: null, customStyleText: null };
}

function detectArticleContentKey(articleTitle: string): string {
  const title = articleTitle.toLowerCase();
  if (/(评测|怎么选|对比|cursor|claude|codex|工具)/i.test(title)) return 'tool_review';
  if (/(我|复盘|7天|做成|收费|故事|亲历|经历)/i.test(title)) return 'personal_narrative';
  if (/(如何|搭建|框架|系统|方法|结构|模型|执行系统)/i.test(title)) return 'methodology_framework';
  return 'trend_judgment';
}

export function detectCoverType(
  articleTitle: string,
  contentText: string,
  imageSystem: ClientImageSystem | null,
): CoverImageType {
  const haystack = `${articleTitle} ${contentText}`.toLowerCase();

  if (/(我|复盘|经历|故事|一天|7天|桌面|工作台|个人)/i.test(haystack)) return 'scene';
  if (/(对比|比较|vs|怎么选|区别|差异)/i.test(haystack)) return 'metaphor';
  if (/(框架|结构|系统|模型|架构|工作流|方法)/i.test(haystack)) return 'conceptual';
  if (/(趋势|判断|未来|变化|为什么)/i.test(haystack)) return 'hero';

  const fallback = imageSystem?.defaults?.cover_type;
  if (fallback && COVER_TYPE_DIRECTIONS[fallback as CoverImageType]) {
    return fallback as CoverImageType;
  }
  return 'conceptual';
}

export function detectInlineType(
  headingText: string,
  contentLines: string[],
  articleTitle: string,
  imageSystem: ClientImageSystem | null,
): InlineImageType {
  const haystack = `${headingText} ${cleanText(contentLines.join(' '))}`.toLowerCase();

  if (/(时间线|阶段|历程|进度|里程碑|演化|发展|7天|第一天|第二天)/i.test(haystack)) return 'timeline';
  if (/(对比|比较|区别|差异|vs|优劣|更适合|前后|两种|三类)/i.test(haystack)) return 'comparison';
  if (/(流程|步骤|工作流|链路|路径|执行|推进|如何|怎么|闭环)/i.test(haystack)) return 'flowchart';
  if (/(框架|结构|架构|系统|模型|能力|层|模块|关系|原则)/i.test(haystack)) return 'framework';
  if (/(数据|指标|图表|增长|占比|统计|数量|分布|看板|dashboard)/i.test(haystack)) return 'infographic';
  if (/(故事|场景|经历|复盘|现场|一天|第一次|工作台|桌面)/i.test(haystack)) return 'scene';

  const fallbackKey = imageSystem?.defaults?.inline_type_by_content?.[detectArticleContentKey(articleTitle)];
  if (fallbackKey && INLINE_TYPE_DIRECTIONS[fallbackKey as InlineImageType]) {
    return fallbackKey as InlineImageType;
  }
  return 'framework';
}

function buildCharacterConstraint(imageSystem: ClientImageSystem | null): string[] {
  const lines: string[] = [];
  if (imageSystem?.subject_constraints?.trim()) {
    lines.push(imageSystem.subject_constraints.trim());
  }
  if (imageSystem?.visual_constraints?.trim()) {
    lines.push(imageSystem.visual_constraints.trim());
  }
  return lines;
}

export function buildInlineImagePrompt(args: {
  articleTitle: string;
  sectionHeading: string;
  contentLines: string[];
  styleText: string;
  color: string;
  imageSystem: ClientImageSystem | null;
}): { prompt: string; inlineType: InlineImageType; styleKey: string | null } {
  const summary = cleanText(args.contentLines.join(' ')).slice(0, 240);
  const inlineType = detectInlineType(args.sectionHeading, args.contentLines, args.articleTitle, args.imageSystem);
  const style = resolveInlineStyleProfile(args.imageSystem, args.styleText);

  const promptParts = [
    `Editorial illustration for a WeChat article titled "${args.articleTitle}"`,
    `section focus: ${args.sectionHeading}`,
    `section summary: ${summary || args.sectionHeading}`,
    `inline image type: ${inlineType}`,
    `type direction: ${INLINE_TYPE_DIRECTIONS[inlineType]}`,
    `accent color family: ${args.color}`,
    'mobile-first composition',
    'clean focal point',
    'editorial quality',
  ];

  if (style.profile) {
    promptParts.push(`visual style key: ${style.key}`);
    promptParts.push(`style direction: ${style.profile.sharedDirection}`);
    promptParts.push(`inline style detail: ${style.profile.inlineDirection}`);
  } else if (style.customStyleText) {
    promptParts.push(`visual style: ${style.customStyleText}`);
  } else {
    promptParts.push(`visual style: ${args.styleText}`);
  }

  promptParts.push(...buildCharacterConstraint(args.imageSystem));
  promptParts.push('no watermark, no logo');
  promptParts.push('allow Chinese labels only when the chosen style strongly requires them');

  return {
    prompt: promptParts.join(', '),
    inlineType,
    styleKey: style.key,
  };
}

export function buildCoverImagePrompt(args: {
  articleTitle: string;
  articleContent: string;
  styleText: string;
  color: string;
  imageSystem: ClientImageSystem | null;
  requestedCoverType?: string;
}): { prompt: string; coverType: CoverImageType; styleKey: string | null } {
  const summary = cleanText(args.articleContent).slice(0, 280);
  const detectedType = detectCoverType(args.articleTitle, args.articleContent, args.imageSystem);
  const requestedType = args.requestedCoverType?.trim().toLowerCase();
  const coverType =
    requestedType && COVER_TYPE_DIRECTIONS[requestedType as CoverImageType]
      ? (requestedType as CoverImageType)
      : detectedType;
  const style = resolveCoverStyleProfile(args.imageSystem, args.styleText);

  const promptParts = [
    `WeChat article cover image for "${args.articleTitle}"`,
    `article summary: ${summary || args.articleTitle}`,
    `cover image type: ${coverType}`,
    `cover type direction: ${COVER_TYPE_DIRECTIONS[coverType]}`,
    `accent color family: ${args.color}`,
    'cinematic wide cover composition',
    'clean focal point',
    'thumbnail-safe central composition',
    'editorial quality',
  ];

  if (style.profile) {
    promptParts.push(`visual style key: ${style.key}`);
    promptParts.push(`style direction: ${style.profile.sharedDirection}`);
    promptParts.push(`cover style detail: ${style.profile.coverDirection}`);
  } else if (style.customStyleText) {
    promptParts.push(`visual style: ${style.customStyleText}`);
  } else {
    promptParts.push(`visual style: ${args.styleText}`);
  }

  promptParts.push(...buildCharacterConstraint(args.imageSystem));
  if (coverType === 'typography') {
    promptParts.push('Chinese title text may appear as a designed poster element, keep it short and legible');
  } else {
    promptParts.push('no text in image');
  }
  promptParts.push('no watermark, no logo');

  return {
    prompt: promptParts.join(', '),
    coverType,
    styleKey: style.key,
  };
}
