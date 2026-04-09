/**
 * AI image generation for WeChat article covers and inline images.
 *
 * Providers: gemini | openai | doubao | qwen
 * Fallback chain: API generation -> Nano Banana prompt library -> prompt-only output
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { findRuntimeConfigPath, SKILL_ROOT } from './runtime-paths.js';
const NANO_BANANA_REFS = resolve(
  SKILL_ROOT,
  'toolkit',
  '.claude',
  'skills',
  'nano-banana-pro-prompts-recommend-skill',
  'references',
);

const SIZE_MAP: Record<string, Record<string, string>> = {
  cover: {
    gemini: '2.35:1',
    openai: '1536x1024',
    doubao: '1280x544',
    qwen: '1880*800',
  },
  article: {
    gemini: '16:9',
    openai: '1536x1024',
    doubao: '1280x720',
    qwen: '2048*1152',
  },
};

const TARGET_ASPECT_RATIOS = {
  cover: 2.35,
  article: 16 / 9,
} as const;

const ASPECT_TOLERANCE = 0.002;

interface ProviderConfig {
  api_key?: string;
  model?: string;
  base_url?: string;
}

interface ImageConfig {
  default_provider?: string;
  providers?: Record<string, ProviderConfig>;
}

interface NanaBananaPrompt {
  id?: string;
  title?: string;
  content?: string;
  description?: string;
  sourceMedia?: string[];
}

interface CliArgs {
  prompt?: string;
  search?: string;
  output: string;
  size: 'cover' | 'article';
  provider?: string;
  fallbackCover: boolean;
  color: string;
  mood: string;
}

export interface ImageGenResult {
  status: 'ok' | 'prompt_only' | 'no_match';
  source?: string;
  file?: string;
  prompt?: string;
  search?: string;
  message?: string;
  prompt_title?: string;
  prompt_id?: string;
  original_prompt?: string;
  api_error?: string;
}

type GenerateFn = (
  prompt: string,
  apiKey: string,
  sizeOrRatio: string,
  model?: string,
  baseUrl?: string,
) => Promise<Buffer>;

function getTargetAspectRatio(size: 'cover' | 'article'): number {
  return TARGET_ASPECT_RATIOS[size];
}

export function needsAspectNormalization(width: number, height: number, targetRatio: number): boolean {
  if (width <= 0 || height <= 0 || targetRatio <= 0) return false;
  return Math.abs(width / height - targetRatio) > ASPECT_TOLERANCE;
}

export function calculateAspectCrop(width: number, height: number, targetRatio: number): { width: number; height: number } {
  if (width <= 0 || height <= 0 || targetRatio <= 0) {
    throw new Error('width, height, and targetRatio must be positive numbers');
  }

  const currentRatio = width / height;
  if (!needsAspectNormalization(width, height, targetRatio)) {
    return { width, height };
  }

  if (currentRatio > targetRatio) {
    return {
      width: Math.max(1, Math.min(width, Math.round(height * targetRatio))),
      height,
    };
  }

  return {
    width,
    height: Math.max(1, Math.min(height, Math.round(width / targetRatio))),
  };
}

function parseSipsDimensions(output: string): { width: number; height: number } | null {
  const widthMatch = output.match(/pixelWidth:\s*(\d+)/);
  const heightMatch = output.match(/pixelHeight:\s*(\d+)/);
  if (!widthMatch || !heightMatch) return null;

  const width = Number(widthMatch[1]);
  const height = Number(heightMatch[1]);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  return { width, height };
}

function normalizeGeneratedImageAspect(filePath: string, size: 'cover' | 'article') {
  const sipsPath = '/usr/bin/sips';
  if (!existsSync(filePath) || !existsSync(sipsPath)) return;

  try {
    const metadata = execFileSync(
      sipsPath,
      ['-g', 'pixelWidth', '-g', 'pixelHeight', filePath],
      { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    const dimensions = parseSipsDimensions(metadata);
    if (!dimensions) return;

    const targetRatio = getTargetAspectRatio(size);
    if (!needsAspectNormalization(dimensions.width, dimensions.height, targetRatio)) return;

    const crop = calculateAspectCrop(dimensions.width, dimensions.height, targetRatio);
    if (crop.width === dimensions.width && crop.height === dimensions.height) return;

    const extension = extname(filePath);
    const stem = extension ? filePath.slice(0, -extension.length) : filePath;
    const tempPath = `${stem}.normalized${extension || '.png'}`;
    execFileSync(
      sipsPath,
      ['-c', String(crop.height), String(crop.width), filePath, '--out', tempPath],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    writeFileSync(filePath, readFileSync(tempPath));
    unlinkSync(tempPath);
    console.error(
      `[INFO] 归一化图片比例: ${dimensions.width}x${dimensions.height} -> ${crop.width}x${crop.height}`,
    );
  } catch (error) {
    console.error(`[WARN] 图片比例归一化失败，保留原图: ${error}`);
  }
}

function loadConfig(): { image: ImageConfig } {
  const path = findRuntimeConfigPath();
  if (path && existsSync(path)) {
    const raw = parseYaml(readFileSync(path, 'utf-8')) ?? {};
    return { image: raw.image ?? {} };
  }
  return { image: {} };
}

function resolveProvider(config: { image: ImageConfig }, explicit?: string): [string, ProviderConfig] {
  const providers = config.image.providers ?? {};

  if (explicit) {
    const provider = providers[explicit];
    if (provider?.api_key) return [explicit, provider];
    console.error(`[WARN] 指定的 provider '${explicit}' 未配置 api_key`);
    return [explicit, provider ?? {}];
  }

  const defaultProvider = config.image.default_provider;
  if (defaultProvider && providers[defaultProvider]?.api_key) {
    return [defaultProvider, providers[defaultProvider]];
  }

  for (const [name, provider] of Object.entries(providers)) {
    if (provider.api_key) {
      console.error(`[INFO] 自动选择 provider: ${name}`);
      return [name, provider];
    }
  }

  return ['', {}];
}

async function httpRetry(
  url: string,
  init: RequestInit,
  retries = 3,
  timeoutMs = 120_000,
): Promise<Response> {
  for (let i = 1; i <= retries; i++) {
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text().then(text => text.slice(0, 300))}`);
      }
      return response;
    } catch (error) {
      if (i === retries) throw error;
      const waitMs = 2 ** (i - 1) * 1000;
      console.error(`[WARN] 请求失败 (${i}/${retries}): ${error} — ${waitMs / 1000}s 后重试`);
      await new Promise(resolveWait => setTimeout(resolveWait, waitMs));
    }
  }
  throw new Error('unreachable');
}

async function generateGemini(
  prompt: string,
  apiKey: string,
  aspectRatio: string,
  model = 'imagen-3.0-generate-002',
): Promise<Buffer> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`;
  const response = await httpRetry(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1, aspectRatio },
      }),
    },
    3,
    90_000,
  );

  const data = (await response.json()) as Record<string, unknown>;
  const predictions = (data.predictions ?? []) as Record<string, string>[];
  const base64 = predictions[0]?.bytesBase64Encoded;
  if (!base64) throw new Error(`Gemini API 无返回: ${JSON.stringify(data).slice(0, 200)}`);
  return Buffer.from(base64, 'base64');
}

async function generateOpenAI(
  prompt: string,
  apiKey: string,
  size: string,
  model = 'gpt-image-1',
  baseUrl = 'https://api.openai.com/v1',
): Promise<Buffer> {
  const response = await httpRetry(
    `${baseUrl}/images/generations`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, prompt, size, n: 1, quality: 'medium' }),
    },
    3,
    120_000,
  );

  const data = (await response.json()) as Record<string, unknown>;
  const items = (data.data ?? []) as Record<string, string>[];
  if (!items.length) throw new Error(`OpenAI API 无返回: ${JSON.stringify(data).slice(0, 200)}`);

  if (items[0].b64_json) return Buffer.from(items[0].b64_json, 'base64');
  if (items[0].url) {
    const imageResponse = await httpRetry(items[0].url, {}, 1, 30_000);
    return Buffer.from(await imageResponse.arrayBuffer());
  }
  throw new Error('OpenAI API 未返回图片数据');
}

async function generateDoubao(
  prompt: string,
  apiKey: string,
  size: string,
  model = 'doubao-seedream-5-0-260128',
  baseUrl = 'https://ark.cn-beijing.volces.com/api/v3',
): Promise<Buffer> {
  const response = await httpRetry(
    `${baseUrl}/images/generations`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, prompt, size, n: 1, response_format: 'b64_json' }),
    },
    3,
    60_000,
  );

  const data = (await response.json()) as Record<string, unknown>;
  const items = (data.data ?? []) as Record<string, string>[];
  if (!items.length) throw new Error(`豆包 API 无返回: ${JSON.stringify(data).slice(0, 200)}`);

  if (items[0].b64_json) return Buffer.from(items[0].b64_json, 'base64');
  if (items[0].url?.startsWith('http')) {
    const imageResponse = await httpRetry(items[0].url, {}, 1, 30_000);
    return Buffer.from(await imageResponse.arrayBuffer());
  }
  throw new Error('豆包 API 未返回图片数据');
}

async function generateQwen(
  prompt: string,
  apiKey: string,
  size: string,
  model = 'qwen-image-2.0-pro',
  baseUrl = 'https://dashscope.aliyuncs.com/api/v1',
): Promise<Buffer> {
  const response = await httpRetry(
    `${baseUrl}/services/aigc/multimodal-generation/generation`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: {
          messages: [
            {
              role: 'user',
              content: [{ text: prompt }],
            },
          ],
        },
        parameters: {
          size,
          watermark: false,
          prompt_extend: true,
          negative_prompt:
            '低分辨率，低画质，肢体畸形，手指畸形，画面过饱和，蜡像感，人脸无细节，过度光滑，构图混乱，文字模糊，扭曲。',
        },
      }),
    },
    3,
    120_000,
  );

  const data = (await response.json()) as {
    output?: {
      choices?: Array<{
        message?: {
          content?: Array<{
            image?: string;
          }>;
        };
      }>;
    };
  };

  const imageUrl = data.output?.choices?.[0]?.message?.content?.find(item => item.image)?.image;
  if (!imageUrl) {
    throw new Error(`Qwen API 无返回图片 URL: ${JSON.stringify(data).slice(0, 300)}`);
  }

  const imageResponse = await httpRetry(imageUrl, {}, 1, 60_000);
  return Buffer.from(await imageResponse.arrayBuffer());
}

const GENERATORS: Record<string, GenerateFn> = {
  gemini: (prompt, apiKey, sizeOrRatio, model) => generateGemini(prompt, apiKey, sizeOrRatio, model),
  openai: (prompt, apiKey, sizeOrRatio, model, baseUrl) => generateOpenAI(prompt, apiKey, sizeOrRatio, model, baseUrl),
  doubao: (prompt, apiKey, sizeOrRatio, model, baseUrl) => generateDoubao(prompt, apiKey, sizeOrRatio, model, baseUrl),
  qwen: (prompt, apiKey, sizeOrRatio, model, baseUrl) => generateQwen(prompt, apiKey, sizeOrRatio, model, baseUrl),
};

function searchNanoBanana(keywords: string, maxResults = 3): NanaBananaPrompt[] {
  const manifestPath = resolve(NANO_BANANA_REFS, 'manifest.json');
  if (!existsSync(manifestPath)) return [];

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  const terms = keywords.toLowerCase().split(/\s+/).filter(term => term.length > 1);
  if (!terms.length) return [];

  const scored: [number, NanaBananaPrompt][] = [];

  for (const category of manifest.categories ?? []) {
    const categoryFile = resolve(NANO_BANANA_REFS, category.file);
    if (!existsSync(categoryFile)) continue;
    try {
      const prompts: NanaBananaPrompt[] = JSON.parse(readFileSync(categoryFile, 'utf-8'));
      for (const prompt of prompts) {
        if (!prompt?.sourceMedia?.length) continue;
        const searchable = `${prompt.content ?? ''} ${prompt.title ?? ''} ${prompt.description ?? ''}`.toLowerCase();
        const score = terms.reduce((sum, term) => sum + (searchable.includes(term) ? 2 : 0), 0);
        if (score > 0) scored.push([score, prompt]);
      }
    } catch {
      // Ignore malformed prompt files.
    }
  }

  scored.sort((left, right) => right[0] - left[0]);
  return scored.slice(0, maxResults).map(([, prompt]) => prompt);
}

async function downloadNanaBananaImage(url: string, outputPath: string): Promise<boolean> {
  try {
    const response = await httpRetry(url, {}, 1, 30_000);
    const buffer = Buffer.from(await response.arrayBuffer());
    writeFileSync(outputPath, buffer);
    console.error(`[INFO] 从 Nano Banana 提示词库下载图片: ${basename(outputPath)} (${(buffer.length / 1024).toFixed(1)} KB)`);
    return true;
  } catch (error) {
    console.error(`[WARN] 下载 Nano Banana 图片失败: ${error}`);
    return false;
  }
}

function selectFallbackCover(_color = '#3498db', _mood = ''): string | null {
  return null;
}

async function downloadFallbackCover(_coverId: string, _outputPath: string): Promise<boolean> {
  return false;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const index = args.indexOf(flag);
    return index >= 0 && index + 1 < args.length ? args[index + 1] : undefined;
  };
  const has = (flag: string) => args.includes(flag);

  const outputPath = get('--output') ?? get('-o');
  if (!outputPath) {
    console.error('需要 --output 参数');
    process.exit(1);
  }

  return {
    prompt: get('--prompt'),
    search: get('--search'),
    output: outputPath,
    size: (get('--size') ?? 'cover') as 'cover' | 'article',
    provider: get('--provider'),
    fallbackCover: has('--fallback-cover'),
    color: get('--color') ?? '#3498db',
    mood: get('--mood') ?? '',
  };
}

function outputJson(data: ImageGenResult) {
  console.log(JSON.stringify(data, null, 2));
}

function normalizeSearchTerms(text: string): string {
  return text.replace(/[,，。.!！?？"'—()（）[\]-]/g, ' ');
}

async function generateFromArgs(args: CliArgs): Promise<ImageGenResult> {
  mkdirSync(dirname(resolve(args.output)), { recursive: true });

  if (args.fallbackCover) {
    return {
      status: 'prompt_only',
      message: '当前版本未提供内置封面资源。请改用 --prompt 和已配置的 provider 生图。',
    };
  }

  if (args.search) {
    const matches = searchNanoBanana(args.search);
    for (const match of matches) {
      if (match.sourceMedia?.[0] && (await downloadNanaBananaImage(match.sourceMedia[0], args.output))) {
        return {
          status: 'ok',
          source: 'nano-banana-library',
          file: args.output,
          prompt_title: match.title ?? '',
          prompt_id: match.id,
          original_prompt: (match.content ?? '').slice(0, 200),
        };
      }
    }

    return {
      status: 'no_match',
      search: args.search,
      message: '提示词库中没有匹配项，请改用 --prompt 配合已配置的 provider 生图。',
    };
  }

  if (!args.prompt) {
    throw new Error('需要 --prompt 或 --search 参数');
  }

  const config = loadConfig();
  const [providerName, providerConfig] = resolveProvider(config, args.provider);

  if (!providerConfig.api_key) {
    const matches = searchNanoBanana(normalizeSearchTerms(args.prompt));
    if (matches.length && matches[0].sourceMedia?.[0]) {
      if (await downloadNanaBananaImage(matches[0].sourceMedia[0], args.output)) {
        return {
          status: 'ok',
          source: 'nano-banana-library',
          file: args.output,
          message: '未配置任何 image provider，已回退到提示词库示例图。',
          prompt_id: matches[0].id,
        };
      }
    }

    return {
      status: 'prompt_only',
      prompt: args.prompt,
      message: '未配置可用的 image provider。请在 config.yaml 中设置 gemini、openai、doubao 或 qwen 的 api_key。',
    };
  }

  const generator = GENERATORS[providerName];
  if (!generator) {
    throw new Error(`未知 provider: ${providerName} (支持: gemini, openai, doubao, qwen)`);
  }

  const sizeValue = SIZE_MAP[args.size][providerName] ?? SIZE_MAP[args.size].openai;

  try {
    const bytes = await generator(
      args.prompt,
      providerConfig.api_key,
      sizeValue,
      providerConfig.model,
      providerConfig.base_url,
    );
    writeFileSync(args.output, bytes);
    normalizeGeneratedImageAspect(args.output, args.size);
    console.error(`[INFO] 图片已保存: ${args.output} (${(bytes.length / 1024).toFixed(1)} KB)`);
    return { status: 'ok', source: providerName, file: args.output };
  } catch (error) {
    console.error(`[ERROR] ${providerName} 生图失败: ${error}`);

    const matches = searchNanoBanana(normalizeSearchTerms(args.prompt));
    if (matches.length && matches[0].sourceMedia?.[0]) {
      if (await downloadNanaBananaImage(matches[0].sourceMedia[0], args.output)) {
        return {
          status: 'ok',
          source: 'nano-banana-library',
          file: args.output,
          api_error: String(error),
        };
      }
    }

    return {
      status: 'prompt_only',
      prompt: args.prompt,
      message: String(error),
    };
  }
}

async function main() {
  const result = await generateFromArgs(parseArgs());
  outputJson(result);
}

export async function generateImageToFile(args: CliArgs): Promise<ImageGenResult> {
  return generateFromArgs(args);
}

export {
  generateGemini,
  generateOpenAI,
  generateDoubao,
  generateQwen,
  searchNanoBanana,
  selectFallbackCover,
  downloadFallbackCover,
  resolveProvider,
  GENERATORS,
  SIZE_MAP,
};

const isMain = process.argv[1]?.includes('image-gen');
if (isMain) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
