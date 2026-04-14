import path from "node:path";
import { fileURLToPath } from "node:url";
import { promises as fs } from "node:fs";

import YAML from "yaml";

export interface AsrConfig {
  provider: string;
  base_url: string;
  api_key: string;
  model: string;
}

export interface LlmConfig {
  enabled: boolean;
  provider: string;
  base_url: string;
  api_key: string;
  model: string;
}

export interface SkillConfig {
  asr: AsrConfig;
  llm: LlmConfig;
}

export interface RuntimePaths {
  skillRoot: string;
  runtimeRoot: string;
  configPath: string;
  outputRoot: string;
  tempRoot: string;
  logRoot: string;
}

export function getRuntimePaths(): RuntimePaths {
  const skillRoot = findSkillRoot();
  const runtimeRoot = path.join(skillRoot, ".ls-multi-collector");
  return {
    skillRoot,
    runtimeRoot,
    configPath: path.join(runtimeRoot, "config.yaml"),
    outputRoot: path.join(skillRoot, "output"),
    tempRoot: path.join(runtimeRoot, "temp"),
    logRoot: path.join(runtimeRoot, "logs")
  };
}

export async function ensureRuntimePaths(): Promise<RuntimePaths> {
  const paths = getRuntimePaths();
  await fs.mkdir(paths.runtimeRoot, { recursive: true });
  await fs.mkdir(paths.outputRoot, { recursive: true });
  await fs.mkdir(paths.tempRoot, { recursive: true });
  await fs.mkdir(paths.logRoot, { recursive: true });
  return paths;
}

export async function loadConfig(): Promise<SkillConfig> {
  const defaults: SkillConfig = {
    asr: {
      provider: "",
      base_url: "",
      api_key: "",
      model: ""
    },
    llm: {
      enabled: false,
      provider: "openai_compatible",
      base_url: "https://api.openai.com/v1",
      api_key: "",
      model: ""
    }
  };

  const { configPath } = getRuntimePaths();
  try {
    const text = await fs.readFile(configPath, "utf8");
    const loaded = YAML.parse(text) as Partial<SkillConfig> | null;
    return {
      asr: { ...defaults.asr, ...(loaded?.asr ?? {}) },
      llm: { ...defaults.llm, ...(loaded?.llm ?? {}) }
    };
  } catch {
    return defaults;
  }
}

export function resolveApiKey(config: { api_key: string }): string {
  return config.api_key.trim();
}

export async function readPrompt(fileName: string): Promise<string> {
  const { skillRoot } = getRuntimePaths();
  return fs.readFile(path.join(skillRoot, "prompts", fileName), "utf8");
}

function findSkillRoot(): string {
  let current = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  for (let index = 0; index < 6; index += 1) {
    const candidate = path.resolve(current, "..");
    if (path.basename(current) === "toolkit") {
      const parent = path.resolve(current, "..");
      if (parent !== current) {
        return parent;
      }
    }
    current = candidate;
  }
  throw new Error("未找到 ls-multi-collector skill 根目录");
}
