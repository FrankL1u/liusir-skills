import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { load as loadHtml } from "cheerio";

import { detectSource } from "./detectSource.js";
import { ensureRuntimePaths } from "./env.js";
import { createBundle, writeJsonFile, writeTextFile } from "./writeOutput.js";

const execFileAsync = promisify(execFile);

interface ArticleImage {
  src: string;
  alt: string;
}

interface ArticleRecord {
  platform: "web" | "wechat" | "x";
  sourceUrl: string;
  title: string;
  authorName: string | null;
  publishedAt: string | null;
  coverUrl: string | null;
  markdownText: string;
  raw: unknown;
  images: ArticleImage[];
}

export interface FetchArticleResult {
  action: "fetch-article";
  platform: ArticleRecord["platform"];
  sourceUrl: string;
  outputDir: string;
  artifacts: string[];
  articlePath: string;
}

export async function fetchArticle(rawInput: string): Promise<FetchArticleResult> {
  const record = await resolveArticleRecord(rawInput);
  const paths = await ensureRuntimePaths();
  const bundle = await createBundle({
    outputRoot: paths.outputRoot,
    action: "fetch-article",
    platform: record.platform,
    title: record.title
  });

  const articlePath = await writeTextFile(bundle.dir, "article.md", `${record.markdownText.trim()}\n`);
  const metadataPath = await writeJsonFile(bundle.dir, "metadata.json", {
    platform: record.platform,
    sourceUrl: record.sourceUrl,
    title: record.title,
    authorName: record.authorName,
    publishedAt: record.publishedAt,
    coverUrl: record.coverUrl,
    imageCount: record.images.length
  });

  return {
    action: "fetch-article",
    platform: record.platform,
    sourceUrl: record.sourceUrl,
    outputDir: bundle.dir,
    artifacts: [articlePath, metadataPath],
    articlePath
  };
}

async function resolveArticleRecord(rawInput: string): Promise<ArticleRecord> {
  const detected = detectSource(rawInput);
  if (detected.kind === "video") {
    throw new Error("fetch-article 不支持视频链接，请改用 transcript-video 或 download-video");
  }
  if (detected.platform === "wechat") {
    return fetchWechatArticle(detected.sourceUrl);
  }
  if (detected.platform === "x") {
    return fetchXArticle(detected.sourceUrl);
  }
  return fetchGenericWebArticle(detected.sourceUrl);
}

async function fetchGenericWebArticle(sourceUrl: string): Promise<ArticleRecord> {
  const markdownText = await runCommand("defuddle", ["parse", sourceUrl, "--md"]);
  const title = extractTitleFromMarkdown(markdownText, sourceUrl);
  return {
    platform: "web",
    sourceUrl,
    title,
    authorName: null,
    publishedAt: null,
    coverUrl: null,
    markdownText,
    raw: { markdown: markdownText },
    images: []
  };
}

async function fetchWechatArticle(sourceUrl: string): Promise<ArticleRecord> {
  const response = await fetch(sourceUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36"
    }
  });
  if (!response.ok) {
    throw new Error(`微信公众号抓取失败: HTTP ${response.status}`);
  }
  const html = await response.text();
  const $ = loadHtml(html);
  const root = $("#js_content").length > 0 ? $("#js_content") : $(".rich_media_content").first();
  if (root.length === 0) {
    throw new Error("未找到微信公众号正文容器");
  }

  const title = ($("#activity-name").text() || $(".rich_media_title").first().text() || "微信公众号文章").trim();
  const authorName = ($("#js_name").text() || $(".rich_media_meta_nickname").first().text() || "").trim() || null;
  const publishedAt = ($("#publish_time").text() || "").trim() || null;
  const images: ArticleImage[] = [];
  root.find("img").each((_index, element) => {
    const src = ($(element).attr("data-src") || $(element).attr("src") || "").trim();
    if (!src || images.some((item) => item.src === src)) {
      return;
    }
    images.push({ src: src.startsWith("//") ? `https:${src}` : src, alt: ($(element).attr("alt") || "").trim() });
  });

  const markdownText = wechatHtmlToMarkdown(root.html() ?? "");
  return {
    platform: "wechat",
    sourceUrl,
    title,
    authorName,
    publishedAt,
    coverUrl: images[0]?.src ?? null,
    markdownText,
    raw: { html, imageCount: images.length },
    images
  };
}

async function fetchXArticle(sourceUrl: string): Promise<ArticleRecord> {
  const raw = await loadXreachPayload(sourceUrl);
  const items = extractXItems(raw);
  const first = items[0] ?? {};
  const title = payloadString(raw, "title") || (authorNameFromX(first) ? `Thread by @${authorNameFromX(first)}` : "X Post");
  const markdownText = renderXMarkdown(items);
  const images = dedupImages(items.flatMap((item) => collectXMedia(item)));
  return {
    platform: "x",
    sourceUrl,
    title,
    authorName: authorNameFromX(first),
    publishedAt: firstDefinedString(first.createdAt, first.created_at, payloadString(raw, "createdAt")),
    coverUrl: images[0]?.src ?? null,
    markdownText,
    raw,
    images
  };
}

export function wechatHtmlToMarkdown(html: string): string {
  const $ = loadHtml(`<div id="root">${html}</div>`);
  $("#root script, #root style").remove();
  const blocks: string[] = [];
  $("#root")
    .children()
    .each((_index, element) => {
      const rendered = renderNodeToMarkdown($, element);
      if (rendered.trim()) {
        blocks.push(rendered.trim());
      }
    });
  return blocks.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

function renderNodeToMarkdown($: ReturnType<typeof loadHtml>, node: unknown): string {
  const element = $(node as Parameters<ReturnType<typeof loadHtml>>[0]);
  const tag = typeof node === "object" && node && "tagName" in node
    ? String((node as { tagName?: string }).tagName ?? "").toLowerCase()
    : "";

  if (tag === "img") {
    const src = (element.attr("data-src") || element.attr("src") || "").trim();
    if (!src) {
      return "";
    }
    const normalized = src.startsWith("//") ? `https:${src}` : src;
    return `![${(element.attr("alt") || "").trim()}](${normalized})`;
  }

  if (tag === "a") {
    const href = (element.attr("href") || "").trim();
    const text = element.text().trim() || href;
    if (href.endsWith(".mp4")) {
      return `<video controls src="${href.startsWith("//") ? `https:${href}` : href}"></video>`;
    }
    if (!href) {
      return text;
    }
    return `[${text}](${href})`;
  }

  if (tag === "br") {
    return "\n";
  }

  if (tag === "section" && element.hasClass("code-snippet__fix")) {
    return renderWechatCodeSnippet($, node);
  }

  if (tag === "ul" && element.hasClass("code-snippet__line-index")) {
    return "";
  }

  if (tag === "pre") {
    return renderPreformattedBlock($, node);
  }

  if (["h1", "h2", "h3", "h4"].includes(tag)) {
    const level = Math.min(Number(tag.slice(1)), 4);
    return `${"#".repeat(level)} ${element.text().trim()}`;
  }

  if (tag === "li") {
    return `- ${renderChildren($, node).trim()}`;
  }

  const content = renderChildren($, node).trim();
  if (!content) {
    return "";
  }
  return content;
}

function renderWechatCodeSnippet($: ReturnType<typeof loadHtml>, node: unknown): string {
  const element = $(node as Parameters<ReturnType<typeof loadHtml>>[0]);
  const preNode = element.find("pre").first();
  if (preNode.length === 0) {
    return renderChildren($, node).trim();
  }
  return renderPreformattedBlock($, preNode.get(0));
}

function renderPreformattedBlock($: ReturnType<typeof loadHtml>, node: unknown): string {
  const element = $(node as Parameters<ReturnType<typeof loadHtml>>[0]);
  const language = (element.attr("data-lang") || "").trim();
  const content = normalizePreformattedText(extractTightText($, node));
  if (!content) {
    return "";
  }
  if (content.includes("\n")) {
    return `\`\`\`${language}\n${content}\n\`\`\``;
  }
  return content;
}

function extractTightText($: ReturnType<typeof loadHtml>, node: unknown): string {
  const pieces: string[] = [];
  $(node as Parameters<ReturnType<typeof loadHtml>>[0])
    .contents()
    .each((_index, child) => {
      if (child.type === "text") {
        const raw = $(child).text();
        if (raw) {
          pieces.push(raw);
        }
        return;
      }
      pieces.push(extractTightText($, child));
    });
  return pieces.join("");
}

function normalizePreformattedText(value: string): string {
  const lines = value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line, index, all) => line || (index > 0 && index < all.length - 1));
  return lines.join("\n").trim();
}

function renderChildren($: ReturnType<typeof loadHtml>, node: unknown): string {
  const pieces: string[] = [];
  $(node as Parameters<ReturnType<typeof loadHtml>>[0])
    .contents()
    .each((_index, child) => {
      if (child.type === "text") {
        const text = $(child)
          .text()
          .replace(/\s+/g, " ")
          .trim();
        if (text) {
          pieces.push(text);
        }
        return;
      }
      pieces.push(renderNodeToMarkdown($, child));
    });
  return pieces.join(" ").replace(/\s+\n/g, "\n").replace(/\n\s+/g, "\n").trim();
}

async function loadXreachPayload(sourceUrl: string): Promise<unknown> {
  const errors: string[] = [];
  for (const subcommand of ["thread", "tweet"]) {
    try {
      const stdout = await runCommand("xreach", [subcommand, sourceUrl, "--json"]);
      return JSON.parse(stdout);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  throw new Error(errors.join("; ") || "xreach 抓取失败");
}

function extractXItems(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
  }
  if (payload && typeof payload === "object" && Array.isArray((payload as { tweets?: unknown[] }).tweets)) {
    return (payload as { tweets: unknown[] }).tweets.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
  }
  return payload && typeof payload === "object" ? [payload as Record<string, unknown>] : [];
}

function renderXMarkdown(items: Record<string, unknown>[]): string {
  return items
    .map((item, index) => {
      const heading = index === 0 ? "## 主推文" : `## 线程 ${index}`;
      const body = firstDefinedString(item.text, item.full_text) ?? "";
      const media = collectXMedia(item)
        .map((entry) => `![${entry.alt}](${entry.src})`)
        .join("\n\n");
      return [heading, body.trim(), media].filter(Boolean).join("\n\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

function collectXMedia(item: Record<string, unknown>): ArticleImage[] {
  const mediaValue = (item as { media?: unknown[] }).media;
  const media = Array.isArray(mediaValue) ? mediaValue : [];
  return media
    .filter((entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null)
    .map((entry) => {
      const src = firstDefinedString(entry.url, entry.preview_image_url, entry.previewImageUrl);
      return {
        src: src ?? "",
        alt: typeof entry.type === "string" ? entry.type : "media"
      };
    })
    .filter((entry) => entry.src);
}

function authorNameFromX(item: Record<string, unknown>): string | null {
  const user = item.user;
  if (user && typeof user === "object") {
    const candidate = (user as { screenName?: string; name?: string }).screenName || (user as { screenName?: string; name?: string }).name;
    if (candidate) {
      return candidate;
    }
  }
  return typeof item.author === "string" ? item.author : null;
}

function dedupImages(images: ArticleImage[]): ArticleImage[] {
  const seen = new Set<string>();
  return images.filter((item) => {
    if (!item.src || seen.has(item.src)) {
      return false;
    }
    seen.add(item.src);
    return true;
  });
}

function payloadString(payload: unknown, key: string): string | null {
  if (payload && typeof payload === "object" && key in payload) {
    const value = (payload as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return null;
}

function firstDefinedString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return null;
}

function extractTitleFromMarkdown(markdown: string, sourceUrl: string): string {
  for (const line of markdown.split("\n")) {
    const stripped = line.trim().replace(/^#+\s*/, "");
    if (stripped) {
      return stripped.slice(0, 120);
    }
  }
  return new URL(sourceUrl).hostname;
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
