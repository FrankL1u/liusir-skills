import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_DIR = resolve(__dirname, '../..');

function slugifyTitle(title: string): string {
  const normalized = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
    .toLowerCase();

  return normalized || 'untitled-article';
}

function currentDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface ArticleBundlePaths {
  bundleDir: string;
  articlePath: string;
  previewPath: string;
  coverPath: string;
  assetsDir: string;
  promptsDir: string;
}

export function createArticleBundlePaths(client: string, title: string): ArticleBundlePaths {
  const slug = slugifyTitle(title);
  const bundleDir = resolve(PROJECT_DIR, 'output', client, `${currentDateString()}-${slug}`);
  const assetsDir = join(bundleDir, 'assets');
  const promptsDir = join(bundleDir, 'prompts');

  mkdirSync(assetsDir, { recursive: true });
  mkdirSync(promptsDir, { recursive: true });

  return {
    bundleDir,
    articlePath: join(bundleDir, 'article.md'),
    previewPath: join(bundleDir, 'preview.html'),
    coverPath: join(bundleDir, 'cover.png'),
    assetsDir,
    promptsDir,
  };
}
