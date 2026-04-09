import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import {
  inferClientFromRuntimeArticlePath,
  relativizeFromRuntimeRoot,
  resolveRuntimeReadPath,
  resolveRuntimeWritePath,
} from './runtime-paths.js';

export interface PublishHistoryEntry {
  title: string;
  digest: string;
  date: string;
  media_id: string;
  cover_media_id?: string;
  author?: string;
  theme?: string;
  tags?: string[];
  word_count?: number;
  file: string;
  stats: {
    read_count: number | null;
    like_count: number | null;
    comment_count: number | null;
    share_count: number | null;
  };
}

interface FrontmatterMetadata {
  digest?: string;
  tags?: string[];
  word_count?: number;
}

function splitFrontmatter(text: string): { frontmatter: string; content: string } {
  if (!text.startsWith('---\n')) {
    return { frontmatter: '', content: text };
  }

  const end = text.indexOf('\n---', 4);
  if (end < 0) {
    return { frontmatter: '', content: text };
  }

  const boundaryEnd = text.indexOf('\n', end + 4);
  const contentStart = boundaryEnd >= 0 ? boundaryEnd + 1 : text.length;
  return {
    frontmatter: text.slice(4, end),
    content: text.slice(contentStart),
  };
}

function parseFrontmatterMetadata(markdownText: string): FrontmatterMetadata {
  const { frontmatter } = splitFrontmatter(markdownText);
  if (!frontmatter.trim()) {
    return {};
  }

  const data = (parseYaml(frontmatter) ?? {}) as Record<string, unknown>;
  const tags = Array.isArray(data.tags)
    ? data.tags.filter((tag): tag is string => typeof tag === 'string')
    : undefined;
  const wordCount = typeof data.word_count === 'number'
    ? data.word_count
    : typeof data.word_count === 'string' && /^\d+$/.test(data.word_count)
      ? parseInt(data.word_count, 10)
      : undefined;

  return {
    digest: typeof data.digest === 'string' ? data.digest : undefined,
    tags,
    word_count: wordCount,
  };
}

function inferClientFromArticlePath(inputPath: string): string | null {
  return inferClientFromRuntimeArticlePath(inputPath);
}

function resolveHistoryReadPath(client: string): string {
  return resolveRuntimeReadPath(['clients', client, 'history.yaml']);
}

function resolveHistoryWritePath(client: string): string {
  return resolveRuntimeWritePath(['clients', client, 'history.yaml']);
}

function loadHistory(historyPath: string): PublishHistoryEntry[] {
  if (!existsSync(historyPath)) {
    return [];
  }

  const parsed = parseYaml(readFileSync(historyPath, 'utf-8')) ?? [];
  if (!Array.isArray(parsed)) {
    throw new Error(`history.yaml 格式异常: ${historyPath}`);
  }

  return parsed as PublishHistoryEntry[];
}

function todayLocal(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function countWordsFromMarkdown(markdownText: string): number {
  const { content } = splitFrontmatter(markdownText);
  const plain = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[[^\]]+\]\([^)]+\)/g, ' ')
    .replace(/^#+\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();

  return plain.length;
}

export interface RecordPublishHistoryInput {
  client?: string;
  inputPath: string;
  title: string;
  digest: string;
  mediaId: string;
  coverMediaId?: string;
  author?: string;
  theme?: string;
}

export function recordPublishHistory(input: RecordPublishHistoryInput): {
  client: string;
  historyPath: string;
  entry: PublishHistoryEntry;
  created: boolean;
} | null {
  const client = input.client ?? inferClientFromArticlePath(input.inputPath);
  if (!client) {
    return null;
  }

  const history = loadHistory(resolveHistoryReadPath(client));
  const historyPath = resolveHistoryWritePath(client);
  const markdownPath = resolve(input.inputPath);
  const markdownText = readFileSync(markdownPath, 'utf-8');
  const metadata = parseFrontmatterMetadata(markdownText);
  const relativeFile = relativizeFromRuntimeRoot(markdownPath);

  const entry: PublishHistoryEntry = {
    title: input.title,
    digest: metadata.digest ?? input.digest,
    date: todayLocal(),
    media_id: input.mediaId,
    ...(input.coverMediaId ? { cover_media_id: input.coverMediaId } : {}),
    ...(input.author ? { author: input.author } : {}),
    ...(input.theme ? { theme: input.theme } : {}),
    ...(metadata.tags ? { tags: metadata.tags } : {}),
    word_count: metadata.word_count ?? countWordsFromMarkdown(markdownText),
    file: relativeFile,
    stats: {
      read_count: null,
      like_count: null,
      comment_count: null,
      share_count: null,
    },
  };

  const existingIndex = history.findIndex((item) =>
    item.media_id === input.mediaId || item.file === relativeFile,
  );

  const created = existingIndex < 0;
  if (existingIndex >= 0) {
    history[existingIndex] = {
      ...history[existingIndex],
      ...entry,
      stats: history[existingIndex].stats ?? entry.stats,
    };
  } else {
    history.unshift(entry);
  }

  writeFileSync(historyPath, stringifyYaml(history), 'utf-8');

  return {
    client,
    historyPath,
    entry,
    created,
  };
}
