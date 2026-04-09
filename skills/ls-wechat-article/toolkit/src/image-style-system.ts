import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { parse as parseYaml } from 'yaml';
import { resolveRuntimeReadPath, SKILL_ROOT } from './runtime-paths.js';

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
  const configPath = resolve(SKILL_ROOT, 'references', 'image-system.yaml');
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
    },
    cover_types: override.cover_types?.length ? override.cover_types : base.cover_types,
    inline_types: override.inline_types?.length ? override.inline_types : base.inline_types,
    styles: override.styles?.length ? override.styles : base.styles,
  };
}

export function loadClientImageSystem(client?: string): ClientImageSystem | null {
  const publicSystem = loadPublicImageSystem();
  if (!client || client === 'default') return publicSystem;

  const stylePath = resolveRuntimeReadPath(['clients', client, 'style.yaml']);
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

function requireCoverType(value: string | undefined): CoverImageType {
  if (!value?.trim()) {
    throw new Error('Explicit cover type is required. Pass --type and let the agent choose it from the references.');
  }

  const normalized = value.trim().toLowerCase();
  if (!(normalized in COVER_TYPE_DIRECTIONS)) {
    throw new Error(`Unknown cover type: ${value}`);
  }

  return normalized as CoverImageType;
}

function requireInlineType(value: string | undefined): InlineImageType {
  if (!value?.trim()) {
    throw new Error('Explicit inline type is required. Pass agent-selected targets instead of letting the toolkit infer them.');
  }

  const normalized = value.trim().toLowerCase();
  if (!(normalized in INLINE_TYPE_DIRECTIONS)) {
    throw new Error(`Unknown inline type: ${value}`);
  }

  return normalized as InlineImageType;
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
  inlineType?: string;
  styleText: string;
  color: string;
  imageSystem: ClientImageSystem | null;
}): { prompt: string; inlineType: InlineImageType; styleKey: string | null } {
  const summary = cleanText(args.contentLines.join(' ')).slice(0, 240);
  const inlineType = requireInlineType(args.inlineType);
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
  const coverType = requireCoverType(args.requestedCoverType);
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
