import { existsSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const SKILL_KEY = "ls-xhs-note";
export const LEGACY_ROOT = path.resolve(__dirname, "../..");

type RuntimePathOptions = {
  cwd?: string;
  homeDir?: string;
  legacyRoot?: string;
};

export function getProjectRuntimeRoot(cwd = process.cwd()): string {
  return path.resolve(cwd, `.${SKILL_KEY}`);
}

export function getUserRuntimeRoot(homeDir = os.homedir()): string {
  return path.resolve(homeDir, ".liusir-skills", SKILL_KEY);
}

export function getLegacyRuntimeRoot(legacyRoot = LEGACY_ROOT): string {
  return path.resolve(legacyRoot);
}

export function getRuntimeRoots(options: RuntimePathOptions = {}): {
  projectRoot: string;
  userRoot: string;
  legacyRoot: string;
} {
  return {
    projectRoot: getProjectRuntimeRoot(options.cwd),
    userRoot: getUserRuntimeRoot(options.homeDir),
    legacyRoot: getLegacyRuntimeRoot(options.legacyRoot),
  };
}

export function resolveRuntimeRoot(options: RuntimePathOptions = {}): string {
  const roots = getRuntimeRoots(options);
  if (existsSync(roots.projectRoot)) return roots.projectRoot;
  if (existsSync(roots.userRoot)) return roots.userRoot;
  if (existsSync(roots.legacyRoot)) return roots.legacyRoot;
  return roots.projectRoot;
}

export function resolveWritableRuntimeRoot(options: RuntimePathOptions = {}): string {
  const roots = getRuntimeRoots(options);
  if (existsSync(roots.projectRoot)) return roots.projectRoot;
  if (existsSync(roots.userRoot)) return roots.userRoot;
  mkdirSync(roots.projectRoot, { recursive: true });
  return roots.projectRoot;
}

export function resolveRuntimeReadPath(segments: string[], options: RuntimePathOptions = {}): string {
  const roots = getRuntimeRoots(options);
  const normalized = segments.filter(Boolean);
  const candidates = [
    path.resolve(roots.projectRoot, ...normalized),
    path.resolve(roots.userRoot, ...normalized),
    path.resolve(roots.legacyRoot, ...normalized),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return path.resolve(resolveRuntimeRoot(options), ...normalized);
}

export function resolveRuntimeWritePath(segments: string[], options: RuntimePathOptions = {}): string {
  const root = resolveWritableRuntimeRoot(options);
  const target = path.resolve(root, ...segments.filter(Boolean));
  mkdirSync(path.dirname(target), { recursive: true });
  return target;
}

export function findRuntimeConfigPath(options: RuntimePathOptions = {}): string | null {
  for (const candidate of [["config.yaml"], ["config.example.yaml"]]) {
    const resolved = resolveRuntimeReadPath(candidate, options);
    if (existsSync(resolved)) return resolved;
  }
  return null;
}

function isWithin(basePath: string, targetPath: string): boolean {
  const rel = path.relative(basePath, targetPath);
  return rel === "" || (!rel.startsWith("..") && !rel.startsWith(`..${path.sep}`) && rel !== "..");
}

export function inferClientFromRuntimeOutputPath(filePath: string, options: RuntimePathOptions = {}): string | null {
  const absolutePath = path.resolve(filePath);
  const roots = getRuntimeRoots(options);
  for (const root of [roots.projectRoot, roots.userRoot, roots.legacyRoot]) {
    const outputRoot = path.resolve(root, "output");
    if (!isWithin(outputRoot, absolutePath)) continue;
    const rel = path.relative(outputRoot, absolutePath);
    const segments = rel.split(/[\\/]/).filter(Boolean);
    if (segments.length >= 2) {
      return segments[0] || null;
    }
  }
  return null;
}
