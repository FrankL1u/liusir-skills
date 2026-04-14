import path from "node:path";
import { execFile } from "node:child_process";
import { createWriteStream } from "node:fs";
import { promises as fs } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { promisify } from "node:util";

import { detectSource } from "./detectSource.js";
import { ensureRuntimePaths } from "./env.js";
import { renderDownloadReport } from "./renderReport.js";
import { createBundle, writeJsonFile, writeTextFile } from "./writeOutput.js";

const execFileAsync = promisify(execFile);
export const DOUYIN_HEADERS = {
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/121.0.2277.107 Version/17.0 Mobile/15E148 Safari/604.1"
};

export interface VideoMetadata {
  platform: "douyin" | "youtube";
  sourceUrl: string;
  mediaId: string;
  title: string;
  description: string;
  durationSeconds: number | null;
  authorName: string | null;
  publishedAt: string | null;
  coverUrl: string | null;
  remoteMediaUrl?: string | null;
  raw: Record<string, unknown>;
}

export interface DownloadVideoResult {
  action: "download-video";
  platform: VideoMetadata["platform"];
  sourceUrl: string;
  outputDir: string;
  artifacts: string[];
  videoPath: string;
}

export async function downloadVideo(rawInput: string): Promise<DownloadVideoResult> {
  const metadata = await resolveVideoMetadata(rawInput);
  const paths = await ensureRuntimePaths();
  const bundle = await createBundle({
    outputRoot: paths.outputRoot,
    action: "download-video",
    platform: metadata.platform,
    title: metadata.title
  });
  const videoPath = await saveVideoArtifact(metadata, bundle.dir);
  const metadataPath = await writeJsonFile(bundle.dir, "metadata.json", metadata);
  const reportPath = await writeTextFile(bundle.dir, "report.md", renderDownloadReport(metadata, path.basename(videoPath)));
  const manifestPath = await writeJsonFile(bundle.dir, "manifest.json", {
    action: "download-video",
    platform: metadata.platform,
    sourceUrl: metadata.sourceUrl,
    title: metadata.title,
    artifacts: [path.basename(videoPath), path.basename(metadataPath), path.basename(reportPath)]
  });

  return {
    action: "download-video",
    platform: metadata.platform,
    sourceUrl: metadata.sourceUrl,
    outputDir: bundle.dir,
    artifacts: [videoPath, metadataPath, reportPath, manifestPath],
    videoPath
  };
}

export async function saveVideoArtifact(metadata: VideoMetadata, bundleDir: string): Promise<string> {
  const outputTemplate = path.join(bundleDir, "video.%(ext)s");
  return metadata.platform === "douyin" && metadata.remoteMediaUrl
    ? downloadRemoteMediaFile(metadata.remoteMediaUrl, path.join(bundleDir, "video.mp4"), DOUYIN_HEADERS)
    : downloadWithYtDlp(metadata.sourceUrl, outputTemplate, bundleDir);
}

export async function resolveVideoMetadata(rawInput: string): Promise<VideoMetadata> {
  const detected = detectSource(rawInput);
  if (detected.kind !== "video" || !["douyin", "youtube"].includes(detected.platform)) {
    throw new Error("该输入不是受支持的视频来源");
  }

  if (detected.platform === "douyin") {
    return resolveDouyinMetadata(detected.sourceUrl);
  }

  const raw = await runJsonCommand("yt-dlp", ["--dump-json", detected.sourceUrl]) as Record<string, unknown>;
  return {
    platform: detected.platform as VideoMetadata["platform"],
    sourceUrl: detected.sourceUrl,
    mediaId: String(raw.id ?? ""),
    title: sanitizeTitle(String(raw.title ?? raw.id ?? detected.platform)),
    description: String(raw.description ?? ""),
    durationSeconds: typeof raw.duration === "number" ? raw.duration : null,
    authorName: firstString(raw.channel, raw.uploader),
    publishedAt: normalizeUploadDate(firstString(raw.upload_date)),
    coverUrl: firstString(raw.thumbnail),
    remoteMediaUrl: null,
    raw
  };
}

async function resolveDouyinMetadata(sourceUrl: string): Promise<VideoMetadata> {
  const response = await fetch(sourceUrl, {
    headers: DOUYIN_HEADERS
  });
  if (!response.ok) {
    throw new Error(`抖音分享页请求失败: HTTP ${response.status}`);
  }
  const html = await response.text();
  return parseDouyinShareHtml(sourceUrl, response.url || sourceUrl, html);
}

export function parseDouyinShareHtml(sourceUrl: string, finalUrl: string, html: string): VideoMetadata {
  const matched = html.match(/window\._ROUTER_DATA\s*=\s*(.*?)<\/script>/su);
  if (!matched?.[1]) {
    throw new Error("从 HTML 中解析抖音视频信息失败");
  }
  const routerData = JSON.parse(matched[1].trim().replace(/;?\s*$/u, "")) as {
    loaderData?: Record<string, {
      videoInfoRes?: {
        item_list?: Array<Record<string, unknown>>;
      };
    }>;
  };

  let item: Record<string, unknown> | null = null;
  for (const value of Object.values(routerData.loaderData ?? {})) {
    const candidate = value?.videoInfoRes?.item_list?.[0];
    if (candidate && typeof candidate === "object") {
      item = candidate;
      break;
    }
  }
  if (!item) {
    throw new Error("无法从抖音页面解析视频信息");
  }

  const videoId = finalUrl.split("?")[0]?.replace(/\/+$/u, "").split("/").at(-1) ?? "douyin";
  const video = asRecord(item.video);
  const playAddr = asRecord(video?.play_addr);
  const cover = asRecord(video?.cover);
  const remoteMediaUrl = firstString(...asStringList(playAddr?.url_list).map((value) => value.replace("playwm", "play")));
  if (!remoteMediaUrl) {
    throw new Error("无法从抖音页面解析视频播放地址");
  }

  const coverUrl = firstString(...asStringList(cover?.url_list));
  const createTime = typeof item.create_time === "number" ? item.create_time : Number(item.create_time ?? 0) || null;
  const raw = {
    ...item,
    shareUrl: finalUrl,
    remoteMediaUrl
  } as Record<string, unknown>;

  return {
    platform: "douyin",
    sourceUrl,
    mediaId: videoId,
    title: sanitizeTitle(firstString(item.desc) ?? `douyin_${videoId}`),
    description: firstString(item.desc) ?? "",
    durationSeconds: typeof video?.duration === "number" ? Math.round(video.duration / 1000) : null,
    authorName: firstString(asRecord(item.author)?.nickname),
    publishedAt: createTime ? new Date(createTime * 1000).toISOString() : null,
    coverUrl,
    remoteMediaUrl,
    raw
  };
}

async function runJsonCommand(command: string, args: string[]): Promise<unknown> {
  const stdout = await runCommand(command, args);
  return JSON.parse(stdout);
}

async function runCommand(command: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync(command, args, { maxBuffer: 1024 * 1024 * 20 });
    return stdout.trim();
  } catch (error) {
    const message = error instanceof Error && "stderr" in error && typeof error.stderr === "string"
      ? error.stderr.trim()
      : error instanceof Error
        ? error.message
        : String(error);
    throw new Error(message || `命令执行失败: ${command}`);
  }
}

async function downloadWithYtDlp(sourceUrl: string, outputTemplate: string, bundleDir: string): Promise<string> {
  await runCommand("yt-dlp", ["--merge-output-format", "mp4", "--output", outputTemplate, sourceUrl]);
  return findDownloadedVideo(bundleDir);
}

async function findDownloadedVideo(bundleDir: string): Promise<string> {
  const entries = await fs.readdir(bundleDir);
  const fileName = entries.find((entry) => /^video\./.test(entry) && !entry.endsWith(".part"));
  if (!fileName) {
    throw new Error("视频下载完成后未找到输出文件");
  }
  return path.join(bundleDir, fileName);
}

function normalizeUploadDate(value?: string | null): string | null {
  if (!value || value.length !== 8) {
    return value ?? null;
  }
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6)}`;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return null;
}

function sanitizeTitle(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, "_").trim() || "untitled";
}

export async function downloadRemoteMediaFile(url: string, targetPath: string, headers?: Record<string, string>): Promise<string> {
  const response = await fetch(url, { headers });
  if (!response.ok || !response.body) {
    throw new Error(`远程媒体下载失败: HTTP ${response.status}`);
  }
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  const writable = createWriteStream(targetPath);
  await pipeline(Readable.fromWeb(response.body as unknown as WebReadableStream), writable);
  return targetPath;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}
