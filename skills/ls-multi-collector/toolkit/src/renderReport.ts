interface VideoLikeMetadata {
  platform: string;
  title: string;
  sourceUrl: string;
  mediaId?: string;
  authorName?: string | null;
  publishedAt?: string | null;
  coverUrl?: string | null;
}

interface ArticleLikeMetadata {
  platform: string;
  title: string;
  sourceUrl: string;
  authorName?: string | null;
  publishedAt?: string | null;
  coverUrl?: string | null;
}

export function renderDownloadReport(metadata: VideoLikeMetadata, videoFileName: string): string {
  return [
    `# ${metadata.title}`,
    "",
    "| 字段 | 值 |",
    "|------|----|",
    `| 平台 | \`${metadata.platform}\` |`,
    `| 媒体 ID | \`${metadata.mediaId ?? ""}\` |`,
    `| 来源链接 | ${metadata.sourceUrl} |`,
    `| 作者 | ${metadata.authorName ?? ""} |`,
    `| 发布时间 | ${metadata.publishedAt ?? ""} |`,
    `| 封面 | ${metadata.coverUrl ?? ""} |`,
    "",
    "## 产物",
    "",
    `- 视频文件：\`${videoFileName}\``
  ].join("\n").trim() + "\n";
}

export function renderTranscriptReport(
  metadata: VideoLikeMetadata,
  normalizedText: string,
  rawText: string,
  translatedText?: string,
  videoFileName?: string
): string {
  const lines = [
    `# ${metadata.title}`,
    "",
    "| 字段 | 值 |",
    "|------|----|",
    `| 平台 | \`${metadata.platform}\` |`,
    `| 媒体 ID | \`${metadata.mediaId ?? ""}\` |`,
    `| 来源链接 | ${metadata.sourceUrl} |`,
    `| 作者 | ${metadata.authorName ?? ""} |`,
    `| 发布时间 | ${metadata.publishedAt ?? ""} |`,
  ];

  if (videoFileName) {
    lines.push(`| 视频文件 | \`${videoFileName}\` |`);
  }

  lines.push("", "## 清洗后逐字稿", "", normalizedText);

  if (translatedText) {
    lines.push("", "## 翻译稿", "", translatedText);
  }

  lines.push("", "## 原始逐字稿", "", rawText);
  return lines.join("\n").trim() + "\n";
}

export function renderArticleReport(metadata: ArticleLikeMetadata, markdownText: string): string {
  return [
    `# ${metadata.title}`,
    "",
    "| 字段 | 值 |",
    "|------|----|",
    `| 平台 | \`${metadata.platform}\` |`,
    `| 来源链接 | ${metadata.sourceUrl} |`,
    `| 作者 | ${metadata.authorName ?? ""} |`,
    `| 发布时间 | ${metadata.publishedAt ?? ""} |`,
    `| 封面 | ${metadata.coverUrl ?? ""} |`,
    "",
    "## 正文",
    "",
    markdownText
  ].join("\n").trim() + "\n";
}
