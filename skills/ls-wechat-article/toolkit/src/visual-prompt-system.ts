import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

import { resolveRuntimeReadPath, SKILL_ROOT } from './runtime-paths.js';

export type VisualScope = 'cover+inline' | 'cover-only' | 'inline-only' | 'none';

export interface VisualsConfig {
  scope: VisualScope;
  style: string;
  palette: string;
  cover: {
    type: string;
    mood: string;
    font: string;
    text_level: string;
    aspect: string;
  };
  inline: {
    density: string;
    type_default: string;
  };
}

export interface VisualDefinition {
  key: string;
  zh?: string;
  aliases?: string[];
  direction: string;
  cover_direction?: string;
  inline_direction?: string;
}

export interface VisualPromptSystem {
  defaults: VisualsConfig;
  global: {
    subject_constraints: string;
    visual_constraints: string;
    negative_prompt: string;
  };
  templates: {
    cover: string;
    inline: string;
  };
  palettes: VisualDefinition[];
  cover_types: VisualDefinition[];
  cover_moods: VisualDefinition[];
  cover_fonts: VisualDefinition[];
  cover_text_levels: VisualDefinition[];
  cover_aspects: VisualDefinition[];
  inline_types: VisualDefinition[];
  inline_density: VisualDefinition[];
  styles: VisualDefinition[];
}

export const DEFAULT_VISUALS: VisualsConfig = {
  scope: 'cover+inline',
  style: 'follow article tone',
  palette: 'default',
  cover: {
    type: 'typography',
    mood: 'balanced',
    font: 'clean',
    text_level: 'title-only',
    aspect: '2.35:1',
  },
  inline: {
    density: 'balanced',
    type_default: 'auto',
  },
};

interface ClientStyleFile {
  visuals?: Partial<VisualsConfig>;
  cover_style?: unknown;
  image_system?: {
    defaults?: {
      cover_style?: unknown;
      inline_style?: unknown;
      cover_type?: unknown;
      inline_type_by_content?: unknown;
    };
  };
  [key: string]: unknown;
}

function cloneDefaultVisuals(): VisualsConfig {
  return {
    ...DEFAULT_VISUALS,
    cover: { ...DEFAULT_VISUALS.cover },
    inline: { ...DEFAULT_VISUALS.inline },
  };
}

function extractYamlBlock(markdown: string): string {
  const match = markdown.match(/```ya?ml\s*\n([\s\S]*?)\n```/i);
  if (!match?.[1]?.trim()) {
    throw new Error('visual_prompt_system_missing_yaml_block');
  }
  return match[1];
}

function assertVisualPromptSystem(value: unknown): asserts value is VisualPromptSystem {
  const system = value as Partial<VisualPromptSystem> | null;
  if (
    !system
    || typeof system !== 'object'
    || !system.defaults
    || !system.global
    || !system.templates?.cover
    || !system.templates?.inline
    || !Array.isArray(system.styles)
    || !Array.isArray(system.cover_types)
    || !Array.isArray(system.inline_types)
  ) {
    throw new Error('invalid_visual_prompt_system');
  }
}

let cachedSystem: VisualPromptSystem | null = null;

export function loadVisualPromptSystem(): VisualPromptSystem {
  if (cachedSystem) return cachedSystem;
  const configPath = resolve(SKILL_ROOT, 'references', 'visual-prompt-system.md');
  const markdown = readFileSync(configPath, 'utf-8');
  const parsed = parseYaml(extractYamlBlock(markdown));
  assertVisualPromptSystem(parsed);
  cachedSystem = parsed;
  return parsed;
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function pickFirstToken(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const token = value.trim().split(/\s+/)[0]?.trim();
  return token || null;
}

function hasLegacyVisualFields(styleFile: ClientStyleFile): boolean {
  return 'cover_style' in styleFile || 'image_system' in styleFile;
}

export function findVisualDefinition(
  definitions: VisualDefinition[],
  requested: string | undefined,
): VisualDefinition | null {
  if (!requested?.trim()) return null;
  const normalized = normalizeToken(requested);
  return definitions.find((definition) => {
    const candidates = [definition.key, definition.zh ?? '', ...(definition.aliases ?? [])]
      .map(candidate => normalizeToken(candidate))
      .filter(Boolean);
    return candidates.includes(normalized);
  }) ?? null;
}

export function resolveVisualDefinition(
  definitions: VisualDefinition[],
  requested: string | undefined,
  kind: string,
): VisualDefinition {
  const definition = findVisualDefinition(definitions, requested);
  if (!definition) {
    throw new Error(`Unknown ${kind}: ${requested ?? ''}`);
  }
  return definition;
}

function mergeVisuals(rawVisuals: Partial<VisualsConfig> | undefined): VisualsConfig {
  const defaults = cloneDefaultVisuals();
  return {
    ...defaults,
    ...(rawVisuals ?? {}),
    cover: {
      ...defaults.cover,
      ...(rawVisuals?.cover ?? {}),
    },
    inline: {
      ...defaults.inline,
      ...(rawVisuals?.inline ?? {}),
    },
  };
}

function renderVisualsYaml(visuals: VisualsConfig): string {
  return [
    'visuals:',
    '  # 配图范围。',
    '  # 可选值：cover+inline, cover-only, inline-only, none',
    `  scope: ${stringifyYaml(visuals.scope).trim()}`,
    '  # 主视觉风格。',
    '  # 可选值：follow article tone, editorial, blueprint, notion, warm, watercolor, scientific, lofi-doodle, multi-panel-manga, notebook-sketch, claymation',
    `  style: ${stringifyYaml(visuals.style).trim()}`,
    '  # 配色方案。',
    '  # 可选值：default, macaron, mono-ink, neon, warm',
    `  palette: ${stringifyYaml(visuals.palette).trim()}`,
    '  # 封面图配置。',
    '  cover:',
    '    # 封面构图类型。',
    '    # 可选值：hero, conceptual, typography, metaphor, scene, minimal',
    `    type: ${stringifyYaml(visuals.cover.type).trim()}`,
    '    # 封面视觉强度。',
    '    # 可选值：subtle, balanced, bold',
    `    mood: ${stringifyYaml(visuals.cover.mood).trim()}`,
    '    # 封面字体方向。',
    '    # 可选值：clean, handwritten, serif, display',
    `    font: ${stringifyYaml(visuals.cover.font).trim()}`,
    '    # 封面文字密度。',
    '    # 可选值：none, title-only, title-subtitle, text-rich',
    `    text_level: ${stringifyYaml(visuals.cover.text_level).trim()}`,
    '    # 封面宽高比。',
    '    # 当前推荐固定为 2.35:1，适配微信公众号封面。',
    `    aspect: ${stringifyYaml(visuals.cover.aspect).trim()}`,
    '  # 正文插图配置。',
    '  inline:',
    '    # 正文插图密度。',
    '    # 可选值：minimal, balanced, per-section, rich, none',
    `    density: ${stringifyYaml(visuals.inline.density).trim()}`,
    '    # 正文插图默认类型。',
    '    # 可选值：auto, infographic, scene, flowchart, comparison, framework, timeline',
    `    type_default: ${stringifyYaml(visuals.inline.type_default).trim()}`,
  ].join('\n');
}

function stringifyClientStyleFile(styleFile: ClientStyleFile & { visuals?: VisualsConfig }): string {
  const { visuals, ...rest } = styleFile;
  const base = stringifyYaml(rest).trimEnd();
  if (!visuals) return `${base}\n`;
  return `${base ? `${base}\n\n` : ''}${renderVisualsYaml(visuals)}\n`;
}

export function migrateClientVisuals(styleFile: ClientStyleFile): ClientStyleFile & { visuals: VisualsConfig } {
  const migrated: ClientStyleFile & { visuals: VisualsConfig } = {
    ...styleFile,
    visuals: mergeVisuals(styleFile.visuals),
  };

  const legacyStyle = pickFirstToken(styleFile.image_system?.defaults?.cover_style)
    ?? pickFirstToken(styleFile.cover_style);
  if (!styleFile.visuals && legacyStyle) {
    migrated.visuals.style = legacyStyle;
  }

  delete migrated.cover_style;
  delete migrated.image_system;
  return migrated;
}

export function loadClientVisuals(client?: string): VisualsConfig {
  if (!client || client === 'default') return cloneDefaultVisuals();
  const stylePath = resolveRuntimeReadPath(['clients', client, 'style.yaml']);
  if (!existsSync(stylePath)) return cloneDefaultVisuals();
  const raw = (parseYaml(readFileSync(stylePath, 'utf-8')) as ClientStyleFile | null) ?? {};
  const migrated = migrateClientVisuals(raw);
  if (hasLegacyVisualFields(raw)) {
    writeFileSync(stylePath, stringifyClientStyleFile(migrated), 'utf-8');
  }
  return migrated.visuals;
}

export function migrateClientStyleFileInPlace(client: string): boolean {
  const stylePath = resolveRuntimeReadPath(['clients', client, 'style.yaml']);
  if (!existsSync(stylePath)) return false;

  const raw = (parseYaml(readFileSync(stylePath, 'utf-8')) as ClientStyleFile | null) ?? {};
  const migrated = migrateClientVisuals(raw);
  const before = JSON.stringify(raw);
  const after = JSON.stringify(migrated);
  if (before === after) return false;

  writeFileSync(stylePath, stringifyClientStyleFile(migrated), 'utf-8');
  return true;
}

export function renderTemplate(template: string, values: Record<string, string>): string {
  return template
    .replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key: string) => values[key] ?? '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .join(', ')
    .replace(/\s+,/g, ',')
    .replace(/,{2,}/g, ',')
    .trim();
}
