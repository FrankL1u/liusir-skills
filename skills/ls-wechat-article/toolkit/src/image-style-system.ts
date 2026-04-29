import {
  findVisualDefinition,
  loadClientVisuals,
  loadVisualPromptSystem,
  renderTemplate,
  resolveVisualDefinition,
  type VisualPromptSystem,
  type VisualsConfig,
} from './visual-prompt-system.js';

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

export interface ClientImageSystem {
  promptSystem: VisualPromptSystem;
  visuals: VisualsConfig;
}

export function loadClientImageSystem(client?: string): ClientImageSystem {
  return {
    promptSystem: loadVisualPromptSystem(),
    visuals: loadClientVisuals(client),
  };
}

function cleanText(text: string): string {
  return text
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[[^\]]+]\([^)]+\)/g, ' ')
    .replace(/[*_`>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function requireCoverType(imageSystem: ClientImageSystem | null, value: string | undefined): CoverImageType {
  if (!value?.trim()) {
    throw new Error('Explicit cover type is required. Pass --type and let the agent choose it from the references.');
  }

  const system = imageSystem?.promptSystem ?? loadVisualPromptSystem();
  const definition = findVisualDefinition(system.cover_types, value);
  if (!definition) {
    throw new Error(`Unknown cover type: ${value}`);
  }

  return definition.key as CoverImageType;
}

function requireInlineType(imageSystem: ClientImageSystem | null, value: string | undefined): InlineImageType {
  if (!value?.trim()) {
    throw new Error('Explicit inline type is required. Pass agent-selected targets instead of letting the toolkit infer them.');
  }

  const system = imageSystem?.promptSystem ?? loadVisualPromptSystem();
  const definition = findVisualDefinition(system.inline_types, value);
  if (!definition) {
    throw new Error(`Unknown inline type: ${value}`);
  }

  return definition.key as InlineImageType;
}

function resolveStyleKey(imageSystem: ClientImageSystem | null, requestedStyle?: string): string {
  const visuals = imageSystem?.visuals;
  if (!requestedStyle?.trim() || requestedStyle.trim().toLowerCase() === 'follow article tone') {
    return visuals?.style ?? requestedStyle ?? 'follow article tone';
  }
  return requestedStyle.trim();
}

function resolvePaletteKey(imageSystem: ClientImageSystem | null, requestedPalette?: string): string {
  return requestedPalette?.trim() || imageSystem?.visuals.palette || 'default';
}

function buildTextRule(system: VisualPromptSystem, textLevel: string): string {
  const normalized = textLevel.trim().toLowerCase();
  if (normalized === 'none') {
    return system.cover_text_levels.find(item => item.key === 'none')?.direction ?? '';
  }
  return system.cover_text_levels.find(item => item.key === textLevel)?.direction ?? '';
}

export function buildInlineImagePrompt(args: {
  articleTitle: string;
  sectionHeading: string;
  contentLines: string[];
  inlineType?: string;
  styleText: string;
  color: string;
  palette?: string;
  imageSystem: ClientImageSystem | null;
}): { prompt: string; inlineType: InlineImageType; styleKey: string | null; negativePrompt?: string } {
  const system = args.imageSystem?.promptSystem ?? loadVisualPromptSystem();
  const visuals = args.imageSystem?.visuals;
  const summary = cleanText(args.contentLines.join(' ')).slice(0, 240);
  const inlineType = requireInlineType(args.imageSystem, args.inlineType);
  const inlineDefinition = resolveVisualDefinition(system.inline_types, inlineType, 'inline type');
  const styleKey = resolveStyleKey(args.imageSystem, args.styleText);
  const styleDefinition = findVisualDefinition(system.styles, styleKey);
  const paletteKey = resolvePaletteKey(args.imageSystem, args.palette);
  const paletteDefinition = resolveVisualDefinition(system.palettes, paletteKey, 'palette');

  return {
    prompt: renderTemplate(system.templates.inline, {
      articleTitle: args.articleTitle,
      sectionHeading: args.sectionHeading,
      sectionSummary: summary || args.sectionHeading,
      inlineType,
      inlineTypeDirection: inlineDefinition.direction,
      color: args.color,
      paletteDirection: paletteDefinition.direction,
      styleKey: styleDefinition?.key ?? styleKey,
      styleDirection: styleDefinition?.direction ?? styleKey,
      inlineStyleDirection: styleDefinition?.inline_direction ?? styleDefinition?.direction ?? styleKey,
      subjectConstraints: system.global.subject_constraints,
      visualConstraints: system.global.visual_constraints,
    }),
    inlineType,
    styleKey: styleDefinition?.key ?? visuals?.style ?? null,
    negativePrompt: system.global.negative_prompt,
  };
}

export function buildCoverImagePrompt(args: {
  articleTitle: string;
  articleContent: string;
  styleText: string;
  color: string;
  palette?: string;
  mood?: string;
  font?: string;
  textLevel?: string;
  aspect?: string;
  imageSystem: ClientImageSystem | null;
  requestedCoverType?: string;
}): { prompt: string; coverType: CoverImageType; styleKey: string | null; negativePrompt?: string } {
  const system = args.imageSystem?.promptSystem ?? loadVisualPromptSystem();
  const visuals = args.imageSystem?.visuals;
  const summary = cleanText(args.articleContent).slice(0, 280);
  const coverType = requireCoverType(args.imageSystem, args.requestedCoverType);
  const coverDefinition = resolveVisualDefinition(system.cover_types, coverType, 'cover type');
  const styleKey = resolveStyleKey(args.imageSystem, args.styleText);
  const styleDefinition = findVisualDefinition(system.styles, styleKey);
  const paletteKey = resolvePaletteKey(args.imageSystem, args.palette);
  const paletteDefinition = resolveVisualDefinition(system.palettes, paletteKey, 'palette');
  const moodKey = args.mood?.trim() || visuals?.cover.mood || system.defaults.cover.mood;
  const fontKey = args.font?.trim() || visuals?.cover.font || system.defaults.cover.font;
  const textLevel = args.textLevel?.trim() || visuals?.cover.text_level || system.defaults.cover.text_level;
  const aspect = args.aspect?.trim() || visuals?.cover.aspect || system.defaults.cover.aspect;
  const moodDefinition = resolveVisualDefinition(system.cover_moods, moodKey, 'cover mood');
  const fontDefinition = resolveVisualDefinition(system.cover_fonts, fontKey, 'cover font');
  const textLevelDefinition = resolveVisualDefinition(system.cover_text_levels, textLevel, 'cover text level');
  const aspectDefinition = resolveVisualDefinition(system.cover_aspects, aspect, 'cover aspect');

  return {
    prompt: renderTemplate(system.templates.cover, {
      articleTitle: args.articleTitle,
      articleSummary: summary || args.articleTitle,
      coverType,
      coverTypeDirection: coverDefinition.direction,
      coverMood: moodDefinition.key,
      coverMoodDirection: moodDefinition.direction,
      coverFont: fontDefinition.key,
      coverFontDirection: fontDefinition.direction,
      coverTextLevel: textLevelDefinition.key,
      coverTextLevelDirection: textLevelDefinition.direction,
      coverAspect: aspectDefinition.key,
      color: args.color,
      paletteDirection: paletteDefinition.direction,
      styleKey: styleDefinition?.key ?? styleKey,
      styleDirection: styleDefinition?.direction ?? styleKey,
      coverStyleDirection: styleDefinition?.cover_direction ?? styleDefinition?.direction ?? styleKey,
      subjectConstraints: system.global.subject_constraints,
      visualConstraints: system.global.visual_constraints,
      textRule: buildTextRule(system, textLevel),
    }),
    coverType,
    styleKey: styleDefinition?.key ?? visuals?.style ?? null,
    negativePrompt: system.global.negative_prompt,
  };
}
