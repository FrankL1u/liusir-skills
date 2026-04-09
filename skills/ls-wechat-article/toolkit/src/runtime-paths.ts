import { existsSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SKILL_ROOT = resolve(__dirname, '../..');
const SKILL_KEY = 'ls-wechat-article';

export interface RuntimePathOptions {
  cwd?: string;
  homeDir?: string;
  legacyRoot?: string;
}

export interface RuntimeRoots {
  projectRoot: string;
  userRoot: string;
  legacyRoot: string;
}

function normalizeSegments(segments: string[]): string[] {
  return segments.filter(Boolean);
}

function pathExists(path: string): boolean {
  try {
    return existsSync(path);
  } catch {
    return false;
  }
}

function ensureParentDir(path: string) {
  mkdirSync(dirname(path), { recursive: true });
}

function isWithin(basePath: string, targetPath: string): boolean {
  const rel = relative(basePath, targetPath);
  return rel === '' || (!rel.startsWith('..') && !rel.startsWith(`..${sep}`) && rel !== '..');
}

export function getProjectRuntimeRoot(cwd = process.cwd()): string {
  return resolve(cwd, `.${SKILL_KEY}`);
}

export function getUserRuntimeRoot(homeDir = os.homedir()): string {
  return resolve(homeDir, '.liusir-skills', SKILL_KEY);
}

export function getLegacyRuntimeRoot(legacyRoot = SKILL_ROOT): string {
  return resolve(legacyRoot);
}

export function getRuntimeRoots(options: RuntimePathOptions = {}): RuntimeRoots {
  return {
    projectRoot: getProjectRuntimeRoot(options.cwd),
    userRoot: getUserRuntimeRoot(options.homeDir),
    legacyRoot: getLegacyRuntimeRoot(options.legacyRoot),
  };
}

export function resolveRuntimeRoot(options: RuntimePathOptions = {}): string {
  const roots = getRuntimeRoots(options);
  if (pathExists(roots.projectRoot)) return roots.projectRoot;
  if (pathExists(roots.userRoot)) return roots.userRoot;
  if (pathExists(roots.legacyRoot)) return roots.legacyRoot;
  return roots.projectRoot;
}

export function resolveWritableRuntimeRoot(options: RuntimePathOptions = {}): string {
  const roots = getRuntimeRoots(options);
  if (pathExists(roots.projectRoot)) return roots.projectRoot;
  if (pathExists(roots.userRoot)) return roots.userRoot;
  mkdirSync(roots.projectRoot, { recursive: true });
  return roots.projectRoot;
}

export function resolveRuntimeReadPath(segments: string[], options: RuntimePathOptions = {}): string {
  const normalized = normalizeSegments(segments);
  const roots = getRuntimeRoots(options);
  const candidates = [
    resolve(roots.projectRoot, ...normalized),
    resolve(roots.userRoot, ...normalized),
    resolve(roots.legacyRoot, ...normalized),
  ];

  for (const candidate of candidates) {
    if (pathExists(candidate)) return candidate;
  }

  return candidates[0];
}

export function findRuntimeReadPath(candidates: string[][], options: RuntimePathOptions = {}): string | null {
  for (const segments of candidates) {
    const resolved = resolveRuntimeReadPath(segments, options);
    if (pathExists(resolved)) return resolved;
  }
  return null;
}

export function resolveRuntimeWritePath(segments: string[], options: RuntimePathOptions = {}): string {
  const normalized = normalizeSegments(segments);
  const root = resolveWritableRuntimeRoot(options);
  const target = resolve(root, ...normalized);
  ensureParentDir(target);
  return target;
}

export function findRuntimeConfigPath(options: RuntimePathOptions = {}): string | null {
  return findRuntimeReadPath([['config.yaml'], ['config.example.yaml']], options);
}

export function inferClientFromRuntimeArticlePath(inputPath: string, options: RuntimePathOptions = {}): string | null {
  const absolutePath = resolve(inputPath);
  const roots = getRuntimeRoots(options);

  for (const root of [roots.projectRoot, roots.userRoot, roots.legacyRoot]) {
    const outputRoot = resolve(root, 'output');
    if (!isWithin(outputRoot, absolutePath)) continue;

    const rel = relative(outputRoot, absolutePath);
    const segments = rel.split(/[\\/]/).filter(Boolean);
    if (segments.length >= 2) {
      return segments[0] ?? null;
    }
  }

  return null;
}

export function relativizeFromRuntimeRoot(filePath: string, options: RuntimePathOptions = {}): string {
  const absolutePath = resolve(filePath);
  const roots = getRuntimeRoots(options);

  for (const root of [roots.projectRoot, roots.userRoot, roots.legacyRoot]) {
    if (!isWithin(root, absolutePath)) continue;
    return relative(root, absolutePath).replace(/\\/g, '/');
  }

  return absolutePath;
}

export {
  SKILL_KEY,
  SKILL_ROOT,
};
