import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';

import { createArticleBundlePaths } from './article-bundle.js';
import { resolveArticleMetadata, stripPrimaryTitle } from './article-metadata.js';
import { generateImageToFile } from './image-gen.js';
import { buildCoverImagePrompt, loadClientImageSystem } from './image-style-system.js';

export interface GenerateCoverOptions {
  input: string;
  output?: string;
  provider?: string;
  style?: string;
  color?: string;
  client?: string;
  type?: string;
}

export interface GenerateCoverResult {
  outputPath: string;
  promptPath: string;
  coverType: string;
  styleKey?: string;
  prompt: string;
}

const DEFAULT_STYLE = 'follow article tone';

function fallbackTitle(inputPath: string): string {
  return basename(inputPath, extname(inputPath));
}

function resolvePromptPath(outputPath: string, promptsDir: string, usingBundleDefault: boolean): string {
  if (usingBundleDefault) return join(promptsDir, 'cover.prompt.txt');
  return join(dirname(outputPath), `${basename(outputPath, extname(outputPath))}.prompt.txt`);
}

export async function generateArticleCover(opts: GenerateCoverOptions): Promise<GenerateCoverResult> {
  const inputPath = resolve(opts.input);
  const rawText = readFileSync(inputPath, 'utf-8');
  const metadata = resolveArticleMetadata(rawText);
  const title = metadata.title || fallbackTitle(inputPath);
  const articleContent = stripPrimaryTitle(rawText);

  const bundle = createArticleBundlePaths(opts.client ?? 'default', title);
  const outputPath = resolve(opts.output ?? bundle.coverPath);
  const usingBundleDefault = !opts.output;
  const promptsDir = usingBundleDefault
    ? bundle.promptsDir
    : join(dirname(outputPath), `${basename(outputPath, extname(outputPath))}.prompts`);
  mkdirSync(dirname(outputPath), { recursive: true });
  mkdirSync(promptsDir, { recursive: true });

  const imageSystem = loadClientImageSystem(opts.client);
  const promptSpec = buildCoverImagePrompt({
    articleTitle: title,
    articleContent,
    styleText: opts.style ?? DEFAULT_STYLE,
    color: opts.color ?? '#3498db',
    imageSystem,
    requestedCoverType: opts.type,
  });
  const promptPath = resolvePromptPath(outputPath, promptsDir, usingBundleDefault);
  writeFileSync(promptPath, `${promptSpec.prompt}\n`, 'utf-8');

  const result = await generateImageToFile({
    prompt: promptSpec.prompt,
    output: outputPath,
    size: 'cover',
    provider: opts.provider,
    fallbackCover: false,
    color: opts.color ?? '#3498db',
    mood: '',
  });

  if (result.status !== 'ok') {
    throw new Error(`封面图生成失败: ${String(result.message ?? result.status ?? 'unknown error')}`);
  }

  return {
    outputPath,
    promptPath,
    coverType: promptSpec.coverType,
    styleKey: promptSpec.styleKey ?? undefined,
    prompt: promptSpec.prompt,
  };
}
