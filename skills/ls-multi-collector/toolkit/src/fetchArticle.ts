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
  threadItems?: XThreadItem[];
}

export interface FetchArticleResult {
  action: "fetch-article";
  platform: ArticleRecord["platform"];
  sourceUrl: string;
  outputDir: string;
  artifacts: string[];
  articlePath: string;
}

interface XUserSummary {
  name: string | null;
  screenName: string | null;
}

interface XMetrics {
  replyCount: number | null;
  retweetCount: number | null;
  quoteCount: number | null;
  likeCount: number | null;
  bookmarkCount: number | null;
  viewCount: number | null;
}

interface XVideoFormat {
  url: string;
  formatId: string | null;
  width: number | null;
  height: number | null;
  resolution: string | null;
  ext: string | null;
  protocol: string | null;
  tbr: number | null;
  filesizeApprox: number | null;
}

interface XVideoResource {
  sourceUrl: string;
  recommendedUrl: string | null;
  resolution: string | null;
  duration: number | null;
  filesizeApprox: number | null;
  thumbnail: string | null;
  formats: XVideoFormat[];
  error?: string;
}

export interface XThreadItem {
  id: string | null;
  index: number;
  text: string;
  user: XUserSummary;
  createdAt: string | null;
  metrics: XMetrics;
  isReply: boolean;
  isQuote: boolean;
  isRetweet: boolean;
  inReplyToTweetId: string | null;
  media: ArticleImage[];
  video: XVideoResource | null;
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
    imageCount: record.images.length,
    ...(record.threadItems ? xMetadataAdditions(record.threadItems) : {})
  });
  const threadItemsPath = record.threadItems
    ? await writeJsonFile(bundle.dir, "thread_items.json", record.threadItems)
    : null;

  return {
    action: "fetch-article",
    platform: record.platform,
    sourceUrl: record.sourceUrl,
    outputDir: bundle.dir,
    artifacts: [articlePath, metadataPath, threadItemsPath].filter((item): item is string => Boolean(item)),
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
  const images = dedupImages(items.flatMap((item) => collectXMedia(item)));
  const videosByTweetId = await resolveXVideoResources(items);
  const markdownText = renderXMarkdown(items, videosByTweetId);
  const threadItems = toXThreadItems(items, videosByTweetId);
  return {
    platform: "x",
    sourceUrl,
    title,
    authorName: authorNameFromX(first),
    publishedAt: firstDefinedString(first.createdAt, first.created_at, payloadString(raw, "createdAt")),
    coverUrl: images[0]?.src ?? null,
    markdownText,
    raw,
    images,
    threadItems
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

export function renderXMarkdown(items: Record<string, unknown>[], videosByTweetId = new Map<string, XVideoResource>()): string {
  const displayItems = selectXMarkdownItems(items);
  return displayItems
    .map((entry) => renderXMarkdownItem(entry.item, entry.heading, videosByTweetId))
    .filter(Boolean)
    .join("\n\n");
}

function selectXMarkdownItems(items: Record<string, unknown>[]): Array<{ item: Record<string, unknown>; heading: string }> {
  const root = items[0];
  if (!root) {
    return [];
  }
  const rootUser = userFromX(root);
  const rootAuthorKey = xUserKey(rootUser);
  const rootAuthorItems = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => xUserKey(userFromX(item)) === rootAuthorKey);
  const otherItems = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => xUserKey(userFromX(item)) !== rootAuthorKey)
    .filter(({ item }) => booleanFromX(item.isReply, Boolean(firstDefinedString(item.inReplyToTweetId, item.in_reply_to_status_id_str))))
    .sort((a, b) => {
      const scoreDelta = xEngagementScore(b.item) - xEngagementScore(a.item);
      return scoreDelta !== 0 ? scoreDelta : a.index - b.index;
    })
    .slice(0, 10);
  return [
    ...rootAuthorItems.map(({ item, index }, authorIndex) => ({
      item,
      heading: authorIndex === 0 ? "## 主推文" : `## 主作者线程 ${index}`
    })),
    ...(otherItems.length ? [{ item: null as unknown as Record<string, unknown>, heading: "## 高互动其他线程" }] : []),
    ...otherItems.map(({ item, index }) => ({
      item,
      heading: `### 线程 ${index}`
    }))
  ];
}

function renderXMarkdownItem(item: Record<string, unknown>, heading: string, videosByTweetId: Map<string, XVideoResource>): string {
  if (heading === "## 高互动其他线程") {
    return heading;
  }
  const body = firstDefinedString(item.text, item.full_text) ?? "";
  const id = firstDefinedString(item.id, item.id_str);
  const video = id ? videosByTweetId.get(id) ?? null : null;
  const user = userFromX(item);
  const meta = [
    `作者：${formatXUser(user)}`,
    firstDefinedString(item.createdAt, item.created_at) ? `时间：${firstDefinedString(item.createdAt, item.created_at)}` : null,
    `互动：${formatXMetrics(metricsFromX(item))}`,
    video ? formatXVideo(video) : null
  ].filter(Boolean).join("\n");
  const media = collectXMedia(item)
    .map((entry) => `![${entry.alt}](${entry.src})`)
    .join("\n\n");
  return [heading, meta, body.trim(), media].filter(Boolean).join("\n\n");
}

function xUserKey(user: XUserSummary): string {
  return user.screenName ?? user.name ?? "";
}

function xEngagementScore(item: Record<string, unknown>): number {
  const metrics = metricsFromX(item);
  const values = [
    metrics.replyCount,
    metrics.retweetCount,
    metrics.quoteCount,
    metrics.likeCount,
    metrics.bookmarkCount
  ];
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

export function toXThreadItems(items: Record<string, unknown>[], videosByTweetId = new Map<string, XVideoResource>()): XThreadItem[] {
  return items.map((item, index) => ({
    id: firstDefinedString(item.id, item.id_str),
    index,
    text: firstDefinedString(item.text, item.full_text) ?? "",
    user: userFromX(item),
    createdAt: firstDefinedString(item.createdAt, item.created_at),
    metrics: metricsFromX(item),
    isReply: booleanFromX(item.isReply, Boolean(firstDefinedString(item.inReplyToTweetId, item.in_reply_to_status_id_str))),
    isQuote: booleanFromX(item.isQuote, false),
    isRetweet: booleanFromX(item.isRetweet, false),
    inReplyToTweetId: firstDefinedString(item.inReplyToTweetId, item.in_reply_to_status_id_str),
    media: collectXMedia(item),
    video: xVideoForItem(item, videosByTweetId)
  }));
}

async function resolveXVideoResources(items: Record<string, unknown>[]): Promise<Map<string, XVideoResource>> {
  const entries = await Promise.all(items.map(async (item): Promise<[string, XVideoResource] | null> => {
    if (!itemHasVideoMedia(item)) {
      return null;
    }
    const id = firstDefinedString(item.id, item.id_str);
    const user = userFromX(item);
    if (!id || !user.screenName) {
      return null;
    }
    const sourceUrl = `https://x.com/${user.screenName}/status/${id}`;
    try {
      const stdout = await runCommand("yt-dlp", ["--dump-json", "--no-playlist", sourceUrl]);
      const payload = JSON.parse(stdout) as Record<string, unknown>;
      return [id, xVideoResourceFromYtDlp(sourceUrl, payload)];
    } catch (error) {
      return [id, {
        sourceUrl,
        recommendedUrl: null,
        resolution: null,
        duration: null,
        filesizeApprox: null,
        thumbnail: collectXMedia(item)[0]?.src ?? null,
        formats: [],
        error: error instanceof Error ? error.message : String(error)
      }];
    }
  }));
  return new Map(entries.filter((entry): entry is [string, XVideoResource] => Boolean(entry)));
}

function itemHasVideoMedia(item: Record<string, unknown>): boolean {
  const mediaValue = (item as { media?: unknown[] }).media;
  const media = Array.isArray(mediaValue) ? mediaValue : [];
  return media.some((entry) => typeof entry === "object" && entry !== null && (entry as { type?: unknown }).type === "video");
}

function xVideoForItem(item: Record<string, unknown>, videosByTweetId: Map<string, XVideoResource>): XVideoResource | null {
  const id = firstDefinedString(item.id, item.id_str);
  return id ? videosByTweetId.get(id) ?? null : null;
}

function xVideoResourceFromYtDlp(sourceUrl: string, payload: Record<string, unknown>): XVideoResource {
  const rawFormats = Array.isArray(payload.formats) ? payload.formats : [];
  const formats = rawFormats
    .filter((format): format is Record<string, unknown> => typeof format === "object" && format !== null)
    .map(toXVideoFormat)
    .filter((format): format is XVideoFormat => Boolean(format));
  const selected = selectRecommendedXVideoFormat(rawFormats);
  return {
    sourceUrl,
    recommendedUrl: selected?.url ?? null,
    resolution: selected?.resolution ?? null,
    duration: numberFromX(payload.duration),
    filesizeApprox: selected?.filesizeApprox ?? null,
    thumbnail: firstDefinedString(payload.thumbnail),
    formats
  };
}

function toXVideoFormat(format: Record<string, unknown>): XVideoFormat | null {
  const url = firstDefinedString(format.url);
  if (!url) {
    return null;
  }
  const width = numberFromX(format.width);
  const height = numberFromX(format.height);
  return {
    url,
    formatId: firstDefinedString(format.format_id, format.formatId),
    width,
    height,
    resolution: firstDefinedString(format.resolution) ?? (width && height ? `${width}x${height}` : null),
    ext: firstDefinedString(format.ext),
    protocol: firstDefinedString(format.protocol),
    tbr: numberFromX(format.tbr),
    filesizeApprox: numberFromX(format.filesize_approx, format.filesizeApprox)
  };
}

export function selectRecommendedXVideoFormat(formats: unknown[]): XVideoFormat | null {
  const candidates = formats
    .filter((format): format is Record<string, unknown> => typeof format === "object" && format !== null)
    .map(toXVideoFormat)
    .filter((format): format is XVideoFormat => Boolean(format))
    .filter((format) => format.ext === "mp4" && format.url.startsWith("https://") && (format.height ?? 0) > 0);
  if (candidates.length === 0) {
    return null;
  }
  const sorted = [...candidates].sort((a, b) => {
    const aDistance = Math.abs((a.height ?? 0) - 720);
    const bDistance = Math.abs((b.height ?? 0) - 720);
    if (aDistance !== bDistance) {
      return aDistance - bDistance;
    }
    return (a.filesizeApprox ?? Number.MAX_SAFE_INTEGER) - (b.filesizeApprox ?? Number.MAX_SAFE_INTEGER);
  });
  return sorted[0];
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
  const user = userFromX(item);
  return user.screenName ?? user.name;
}

function userFromX(item: Record<string, unknown>): XUserSummary {
  const user = item.user;
  if (user && typeof user === "object") {
    const record = user as { screenName?: unknown; name?: unknown; username?: unknown };
    return {
      name: firstDefinedString(record.name),
      screenName: firstDefinedString(record.screenName, record.username)
    };
  }
  return {
    name: firstDefinedString(item.authorName, item.name),
    screenName: firstDefinedString(item.author, item.screenName, item.username)
  };
}

function metricsFromX(item: Record<string, unknown>): XMetrics {
  return {
    replyCount: numberFromX(item.replyCount, item.reply_count),
    retweetCount: numberFromX(item.retweetCount, item.retweet_count),
    quoteCount: numberFromX(item.quoteCount, item.quote_count),
    likeCount: numberFromX(item.likeCount, item.favorite_count, item.like_count),
    bookmarkCount: numberFromX(item.bookmarkCount, item.bookmark_count),
    viewCount: numberFromX(item.viewCount, item.view_count)
  };
}

function formatXUser(user: XUserSummary): string {
  if (user.name && user.screenName) {
    return `${user.name} (@${user.screenName})`;
  }
  if (user.screenName) {
    return `@${user.screenName}`;
  }
  return user.name ?? "未知";
}

function formatXMetrics(metrics: XMetrics): string {
  return [
    ["评论", metrics.replyCount],
    ["转发", metrics.retweetCount],
    ["引用", metrics.quoteCount],
    ["点赞", metrics.likeCount],
    ["收藏", metrics.bookmarkCount],
    ["查看", metrics.viewCount]
  ].map(([label, value]) => `${label} ${value ?? ""}`.trim()).join(" · ");
}

function formatXVideo(video: XVideoResource): string {
  const pieces = [
    video.recommendedUrl ? `视频：${video.recommendedUrl}` : "视频：未解析到可用 mp4",
    video.resolution ? `规格：${video.resolution}` : null,
    video.duration !== null ? `时长：${Math.round(video.duration)}s` : null,
    video.filesizeApprox !== null ? `约 ${formatBytes(video.filesizeApprox)}` : null
  ].filter(Boolean);
  return pieces.join(" · ");
}

function formatBytes(value: number): string {
  if (value >= 1024 * 1024) {
    return `${(value / 1024 / 1024).toFixed(1)}MB`;
  }
  if (value >= 1024) {
    return `${(value / 1024).toFixed(1)}KB`;
  }
  return `${value}B`;
}

function xMetadataAdditions(threadItems: XThreadItem[]): Record<string, unknown> {
  const authors = Array.from(new Set(threadItems.map((item) => item.user.screenName ?? item.user.name).filter(Boolean)));
  const rootUser = threadItems[0]?.user;
  return {
    itemCount: threadItems.length,
    authors,
    rootAuthorName: rootUser?.name ?? null,
    rootAuthorScreenName: rootUser?.screenName ?? null
  };
}

function numberFromX(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

function booleanFromX(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
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
