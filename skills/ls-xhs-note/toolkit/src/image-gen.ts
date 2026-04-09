import { Command } from "commander";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse as parseYaml } from "yaml";
import { findRuntimeConfigPath } from "./runtime-paths.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type ProviderName = "gemini" | "openai" | "doubao" | "qwen";

type ProviderConfig = {
  api_key?: string;
  model?: string;
  base_url?: string;
};

type ImageConfig = {
  default_provider?: string;
  providers?: Record<string, ProviderConfig>;
};

type RootConfig = {
  image?: ImageConfig;
};

type CliOptions = {
  prompt: string;
  output: string;
  size: "series" | "inline";
  provider?: string;
};

export type ImageGenerationResult = {
  status: "ok" | "prompt_only";
  provider: string;
  output: string;
  prompt: string;
  message?: string;
};

export const DEFAULT_QWEN_MODEL = "qwen-image-2.0";

const SIZE_MAP: Record<CliOptions["size"], Record<ProviderName, string>> = {
  series: {
    gemini: "9:16",
    openai: "1024x1792",
    doubao: "1024x1792",
    qwen: "1024*1792",
  },
  inline: {
    gemini: "9:16",
    openai: "1024x1792",
    doubao: "1024x1792",
    qwen: "1024*1792",
  },
};

export function resolveImageSize(size: CliOptions["size"], provider: ProviderName): string {
  return SIZE_MAP[size][provider];
}

function loadConfig(): RootConfig {
  const configPath = findRuntimeConfigPath();
  if (configPath && existsSync(configPath)) {
    return (parseYaml(readFileSync(configPath, "utf-8")) ?? {}) as RootConfig;
  }
  return {};
}

function resolveProvider(config: RootConfig, explicit?: string): [string, ProviderConfig] {
  const providers = config.image?.providers ?? {};

  if (explicit) {
    return [explicit, providers[explicit] ?? {}];
  }

  const defaultProvider = config.image?.default_provider;
  if (defaultProvider && providers[defaultProvider]?.api_key) {
    return [defaultProvider, providers[defaultProvider]];
  }

  for (const [name, provider] of Object.entries(providers)) {
    if (provider.api_key) return [name, provider];
  }

  return ["", {}];
}

async function httpRetry(url: string, init: RequestInit, retries = 3, timeoutMs = 120_000): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
      if (!response.ok) {
        const body = await response.text().then((text) => text.slice(0, 500));
        if (response.status === 429 && attempt < retries) {
          const waitMs = attempt * 5000;
          await new Promise((resolveWait) => setTimeout(resolveWait, waitMs));
          continue;
        }
        throw new Error(`HTTP ${response.status}: ${body}`);
      }
      return response;
    } catch (error) {
      if (attempt === retries) throw error;
      const message = error instanceof Error ? error.message : String(error);
      const waitMs = /429|RateQuota|rate limit/i.test(message) ? attempt * 5000 : attempt * 1000;
      await new Promise((resolveWait) => setTimeout(resolveWait, waitMs));
    }
  }
  throw new Error("unreachable");
}

async function generateGemini(prompt: string, apiKey: string, aspectRatio: string, model = "imagen-3.0-generate-002"): Promise<Buffer> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`;
  const response = await httpRetry(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1, aspectRatio },
      }),
    },
    3,
    90_000,
  );

  const data = (await response.json()) as Record<string, unknown>;
  const predictions = (data.predictions ?? []) as Array<Record<string, string>>;
  const base64 = predictions[0]?.bytesBase64Encoded;
  if (!base64) throw new Error(`Gemini API returned no image data: ${JSON.stringify(data).slice(0, 240)}`);
  return Buffer.from(base64, "base64");
}

async function generateOpenAI(
  prompt: string,
  apiKey: string,
  size: string,
  model = "gpt-image-1",
  baseUrl = "https://api.openai.com/v1",
): Promise<Buffer> {
  const response = await httpRetry(
    `${baseUrl}/images/generations`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, prompt, size, n: 1, quality: "medium" }),
    },
    3,
    120_000,
  );

  const data = (await response.json()) as Record<string, unknown>;
  const items = (data.data ?? []) as Array<Record<string, string>>;
  if (!items.length) throw new Error(`OpenAI API returned no image data: ${JSON.stringify(data).slice(0, 240)}`);
  if (items[0].b64_json) return Buffer.from(items[0].b64_json, "base64");
  if (items[0].url) {
    const imageResponse = await httpRetry(items[0].url, {}, 1, 60_000);
    return Buffer.from(await imageResponse.arrayBuffer());
  }
  throw new Error("OpenAI API returned no usable image payload");
}

async function generateDoubao(
  prompt: string,
  apiKey: string,
  size: string,
  model = "doubao-seedream-5-0-260128",
  baseUrl = "https://ark.cn-beijing.volces.com/api/v3",
): Promise<Buffer> {
  const response = await httpRetry(
    `${baseUrl}/images/generations`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, prompt, size, n: 1, response_format: "b64_json" }),
    },
    3,
    120_000,
  );

  const data = (await response.json()) as Record<string, unknown>;
  const items = (data.data ?? []) as Array<Record<string, string>>;
  if (!items.length) throw new Error(`Doubao API returned no image data: ${JSON.stringify(data).slice(0, 240)}`);
  if (items[0].b64_json) return Buffer.from(items[0].b64_json, "base64");
  if (items[0].url) {
    const imageResponse = await httpRetry(items[0].url, {}, 1, 60_000);
    return Buffer.from(await imageResponse.arrayBuffer());
  }
  throw new Error("Doubao API returned no usable image payload");
}

async function generateQwen(
  prompt: string,
  apiKey: string,
  size: string,
  model = DEFAULT_QWEN_MODEL,
  baseUrl = "https://dashscope.aliyuncs.com/api/v1",
): Promise<Buffer> {
  const response = await httpRetry(
    `${baseUrl}/services/aigc/multimodal-generation/generation`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: {
          messages: [
            {
              role: "user",
              content: [{ text: prompt }],
            },
          ],
        },
        parameters: {
          size,
          watermark: false,
          prompt_extend: true,
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
          content?: Array<{ image?: string }>;
        };
      }>;
    };
  };
  const imageUrl = data.output?.choices?.[0]?.message?.content?.find((item) => item.image)?.image;
  if (!imageUrl) throw new Error(`Qwen API returned no image URL: ${JSON.stringify(data).slice(0, 240)}`);
  const imageResponse = await httpRetry(imageUrl, {}, 1, 60_000);
  return Buffer.from(await imageResponse.arrayBuffer());
}

function deriveFallbackPath(outputPath: string): string {
  const ext = extname(outputPath);
  if (!ext) return `${outputPath}-fallback.txt`;
  return outputPath.slice(0, -ext.length) + "-fallback.txt";
}

function writePromptOnlyOutput(outputPath: string, provider: string, prompt: string, reason: string): ImageGenerationResult {
  const fallbackPath = deriveFallbackPath(outputPath);
  mkdirSync(dirname(fallbackPath), { recursive: true });
  writeFileSync(fallbackPath, `provider=${provider || "prompt-only"}\nprompt=${prompt}\nreason=${reason}\n`, "utf-8");
  return {
    status: "prompt_only",
    provider: provider || "prompt-only",
    output: fallbackPath,
    prompt,
    message: reason,
  };
}

export async function generateImageToFile(options: CliOptions): Promise<ImageGenerationResult> {
  const outputPath = resolve(options.output);
  const config = loadConfig();
  const [providerName, providerConfig] = resolveProvider(config, options.provider);

  if (!providerName || !providerConfig.api_key) {
    return writePromptOnlyOutput(outputPath, providerName, options.prompt, "No configured image provider found");
  }

  const provider = providerName as ProviderName;
  const size = resolveImageSize(options.size, provider);

  try {
    let bytes: Buffer;
    if (provider === "gemini") {
      bytes = await generateGemini(options.prompt, providerConfig.api_key, size, providerConfig.model);
    } else if (provider === "openai") {
      bytes = await generateOpenAI(options.prompt, providerConfig.api_key, size, providerConfig.model, providerConfig.base_url);
    } else if (provider === "doubao") {
      bytes = await generateDoubao(options.prompt, providerConfig.api_key, size, providerConfig.model, providerConfig.base_url);
    } else {
      bytes = await generateQwen(options.prompt, providerConfig.api_key, size, providerConfig.model, providerConfig.base_url);
    }

    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, bytes);
    return {
      status: "ok",
      provider,
      output: outputPath,
      prompt: options.prompt,
    };
  } catch (error) {
    return writePromptOnlyOutput(
      outputPath,
      provider,
      options.prompt,
      error instanceof Error ? error.message : String(error),
    );
  }
}

async function main(): Promise<void> {
  const program = new Command();
  program
    .requiredOption("--prompt <prompt>")
    .requiredOption("--output <output>")
    .option("--size <size>", "series or inline", "series")
    .option("--provider <provider>", "image provider")
    .action(async (options) => {
      const result = await generateImageToFile({
        prompt: options.prompt,
        output: options.output,
        size: options.size === "inline" ? "inline" : "series",
        provider: options.provider,
      });
      console.log(result.output);
      if (result.status !== "ok" && result.message) {
        console.error(`[WARN] ${result.message}`);
      }
    });

  await program.parseAsync(process.argv);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main();
}
