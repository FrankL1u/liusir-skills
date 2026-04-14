import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { getRuntimePaths, loadConfig, resolveApiKey, type SkillConfig } from "./env.js";

const execFileAsync = promisify(execFile);

export interface DoctorReport {
  commands: Record<string, boolean>;
  pythonModules: Record<string, boolean>;
  configPresent: boolean;
  asrConfigured: boolean;
  llmConfigured: boolean;
  paths: {
    configPath: string;
    outputRoot: string;
    tempRoot: string;
    logRoot: string;
  };
}

interface InspectOptions {
  commandExists?: (name: string) => Promise<boolean>;
  pythonModuleExists?: (name: string) => Promise<boolean>;
  configPresent?: boolean;
  config?: SkillConfig;
}

const REQUIRED_COMMANDS = ["node", "npm", "uv", "ffmpeg", "defuddle", "xreach", "yt-dlp"] as const;
const REQUIRED_PYTHON_MODULES = ["camoufox"] as const;

export async function inspectEnvironment(options: InspectOptions = {}): Promise<DoctorReport> {
  const paths = getRuntimePaths();
  const config = options.config ?? await loadConfig();
  const commandExists = options.commandExists ?? defaultCommandExists;
  const pythonModuleExists = options.pythonModuleExists ?? defaultPythonModuleExists;

  const commands = Object.fromEntries(
    await Promise.all(REQUIRED_COMMANDS.map(async (command) => [command, await commandExists(command)]))
  );
  const pythonModules = Object.fromEntries(
    await Promise.all(REQUIRED_PYTHON_MODULES.map(async (moduleName) => [moduleName, await pythonModuleExists(moduleName)]))
  );
  const configPresent = options.configPresent ?? commands.uv;
  const asrConfigured = Boolean(config.asr.provider && resolveApiKey(config.asr));
  const llmConfigured = Boolean(config.llm.enabled && resolveApiKey(config.llm));

  return {
    commands,
    pythonModules,
    configPresent,
    asrConfigured,
    llmConfigured,
    paths: {
      configPath: paths.configPath,
      outputRoot: paths.outputRoot,
      tempRoot: paths.tempRoot,
      logRoot: paths.logRoot
    }
  };
}

export async function runDoctor(): Promise<DoctorReport> {
  return inspectEnvironment();
}

async function defaultCommandExists(name: string): Promise<boolean> {
  try {
    await execFileAsync("sh", ["-lc", `command -v '${name}' >/dev/null 2>&1`]);
    return true;
  } catch {
    return false;
  }
}

async function defaultPythonModuleExists(name: string): Promise<boolean> {
  try {
    await execFileAsync("python3", ["-c", `import ${name}`]);
    return true;
  } catch {
    return false;
  }
}
