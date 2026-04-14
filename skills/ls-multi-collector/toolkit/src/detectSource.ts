import { normalizeInput } from "./normalizeInput.js";

export type SourcePlatform = "douyin" | "youtube" | "wechat" | "x" | "web";
export type SourceKind = "video" | "article";

export interface DetectedSource {
  rawInput: string;
  sourceUrl: string;
  platform: SourcePlatform;
  kind: SourceKind;
}

const SUPPORTED_DOMAINS = [
  "douyin.com",
  "iesdouyin.com",
  "v.douyin.com",
  "youtube.com",
  "youtu.be",
  "x.com",
  "twitter.com",
  "mp.weixin.qq.com"
];

export function extractPrimaryUrl(text: string): string {
  const normalized = normalizeInput(text);
  const urls = normalized.match(/https?:\/\/[^\s]+/g) ?? [];
  for (const url of urls) {
    if (SUPPORTED_DOMAINS.some((domain) => url.includes(domain))) {
      return trimTrailingPunctuation(url);
    }
  }
  if (urls.length > 0) {
    const firstUrl = urls[0];
    if (firstUrl) {
      return trimTrailingPunctuation(firstUrl);
    }
  }

  throw new Error("输入内容中未找到可识别的链接");
}

export function detectSource(input: string): DetectedSource {
  const sourceUrl = extractPrimaryUrl(input);
  return {
    rawInput: normalizeInput(input),
    sourceUrl,
    platform: detectPlatform(sourceUrl),
    kind: detectKind(sourceUrl)
  };
}

function detectPlatform(url: string): SourcePlatform {
  if (url.includes("douyin.com") || url.includes("iesdouyin.com")) {
    return "douyin";
  }
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    return "youtube";
  }
  if (url.includes("mp.weixin.qq.com")) {
    return "wechat";
  }
  if (url.includes("x.com") || url.includes("twitter.com")) {
    return "x";
  }
  return "web";
}

function detectKind(url: string): SourceKind {
  const platform = detectPlatform(url);
  if (platform === "douyin" || platform === "youtube") {
    return "video";
  }
  return "article";
}

function trimTrailingPunctuation(value: string): string {
  return value.replace(/[),.;!?，。！？；）]+$/u, "");
}
