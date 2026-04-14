import { cleanTranscript } from "./cleanTranscript.js";
import { detectSource } from "./detectSource.js";
import { ensureRuntimePaths, loadConfig, readPrompt, resolveApiKey } from "./env.js";
import { renderTranscriptReport } from "./renderReport.js";
import { createBundle, writeJsonFile, writeTextFile } from "./writeOutput.js";
import { resolveVideoMetadata, type VideoMetadata } from "./downloadVideo.js";

interface TranscriptPayload {
  language: string | null;
  text: string;
  raw: unknown;
  sourceKind: "official_subtitle" | "asr";
}

export interface TranscriptVideoResult {
  action: "transcript-video";
  platform: VideoMetadata["platform"];
  sourceUrl: string;
  outputDir: string;
  artifacts: string[];
  transcriptPath: string;
  translationPath?: string;
  sourceKind: TranscriptPayload["sourceKind"];
}

export async function transcriptVideo(rawInput: string): Promise<TranscriptVideoResult> {
  const detected = detectSource(rawInput);
  if (detected.kind !== "video" || !["douyin", "youtube"].includes(detected.platform)) {
    throw new Error("该输入不是受支持的视频来源");
  }

  const metadata = await resolveVideoMetadata(rawInput);
  const paths = await ensureRuntimePaths();
  const bundle = await createBundle({
    outputRoot: paths.outputRoot,
    action: "transcript-video",
    platform: metadata.platform,
    title: metadata.title
  });
  const metadataPath = await writeJsonFile(bundle.dir, "metadata.json", metadata);

  const payload = await resolveTranscriptPayload(metadata, paths.configPath);
  let normalizedText = cleanTranscript(payload.text);
  let translatedText: string | undefined;

  const config = await loadConfig();
  if (isLlmConfigured(config)) {
    normalizedText = await cleanupWithLlm(config, metadata, normalizedText);
    if (shouldTranslate(normalizedText)) {
      translatedText = await translateWithLlm(config, normalizedText);
    }
  }

  const rawPath = await writeJsonFile(bundle.dir, "raw.json", payload.raw);
  const transcriptPath = await writeTextFile(bundle.dir, "transcript.md", `${normalizedText.trim()}\n`);
  const reportPath = await writeTextFile(
    bundle.dir,
    "report.md",
    renderTranscriptReport(metadata, normalizedText, payload.text, translatedText)
  );
  const translationPath = translatedText
    ? await writeTextFile(bundle.dir, "translation.md", `${translatedText.trim()}\n`)
    : undefined;
  const manifestPath = await writeJsonFile(bundle.dir, "manifest.json", {
    action: "transcript-video",
    platform: metadata.platform,
    sourceUrl: metadata.sourceUrl,
    sourceKind: payload.sourceKind,
    title: metadata.title,
    artifacts: ["metadata.json", "raw.json", "transcript.md", "report.md", translationPath ? "translation.md" : null].filter(Boolean)
  });

  return {
    action: "transcript-video",
    platform: metadata.platform,
    sourceUrl: metadata.sourceUrl,
    outputDir: bundle.dir,
    artifacts: [metadataPath, rawPath, transcriptPath, reportPath, manifestPath, ...(translationPath ? [translationPath] : [])],
    transcriptPath,
    translationPath,
    sourceKind: payload.sourceKind
  };
}

async function resolveTranscriptPayload(metadata: VideoMetadata, configPath: string): Promise<TranscriptPayload> {
  const official = await fetchOfficialSubtitle(metadata);
  if (official) {
    return official;
  }

  return tryRemoteAsr(metadata, configPath);
}

async function fetchOfficialSubtitle(metadata: VideoMetadata): Promise<TranscriptPayload | null> {
  if (metadata.platform === "youtube") {
    return fetchYoutubeTranscript(metadata);
  }
  return null;
}

async function fetchYoutubeTranscript(metadata: VideoMetadata): Promise<TranscriptPayload | null> {
  const youtubeTranscript = await loadYoutubeTranscriptModule();
  const languages = ["zh-Hans", "zh-Hant", "zh", "en"];
  for (const lang of languages) {
    try {
      const items = await youtubeTranscript.fetchTranscript(metadata.mediaId, { lang }) as Array<{ text: string }>;
      if (items.length === 0) {
        continue;
      }
      return {
        language: lang,
        text: items.map((item) => item.text).join("\n").trim(),
        raw: items,
        sourceKind: "official_subtitle"
      };
    } catch {
      continue;
    }
  }
  return null;
}

async function loadYoutubeTranscriptModule(): Promise<{ fetchTranscript: (videoId: string, config?: { lang?: string }) => Promise<Array<{ text: string }>> }> {
  const moduleUrl = new URL("../node_modules/youtube-transcript/dist/youtube-transcript.esm.js", import.meta.url);
  return import(moduleUrl.href) as Promise<{ fetchTranscript: (videoId: string, config?: { lang?: string }) => Promise<Array<{ text: string }>> }>;
}

async function tryRemoteAsr(metadata: VideoMetadata, configPath: string): Promise<TranscriptPayload> {
  const config = await loadConfig();
  const apiKey = resolveApiKey(config.asr);
  if (!config.asr.provider || !apiKey || config.asr.provider !== "dashscope") {
    throw new Error(getAsrSetupInstruction(configPath));
  }

  const remoteFileUrl = resolveTranscriptRemoteSourceUrl(metadata);
  if (!remoteFileUrl) {
    throw new Error("无法获取可提交到 ASR 的媒体地址");
  }

  const submitUrl = config.asr.base_url || "https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription";
  const taskBaseUrl = "https://dashscope.aliyuncs.com/api/v1/tasks/";
  const response = await fetch(submitUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-DashScope-Async": "enable"
    },
    body: JSON.stringify({
      model: config.asr.model || "qwen3-asr-flash-filetrans",
      input: { file_url: remoteFileUrl },
      parameters: {
        channel_id: [0],
        language: "zh",
        enable_itn: false,
        enable_words: true
      }
    })
  });
  if (!response.ok) {
    throw new Error(`ASR 提交失败: HTTP ${response.status}`);
  }
  const submitPayload = await response.json() as { output?: { task_id?: string } };
  const taskId = submitPayload.output?.task_id;
  if (!taskId) {
    throw new Error("ASR 提交失败：未返回 task_id");
  }

  for (let attempt = 0; attempt < 30; attempt += 1) {
    await sleep(Math.min(5000, 1000 + attempt * 500));
    const pollResponse = await fetch(`${taskBaseUrl}${taskId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    });
    if (!pollResponse.ok) {
      throw new Error(`ASR 轮询失败: HTTP ${pollResponse.status}`);
    }
    const pollPayload = await pollResponse.json() as {
      output?: {
        task_status?: string;
        result?: { transcription_url?: string };
        results?: Array<{ text?: string; sentence?: string }>;
      };
      segments?: Array<{ text?: string; sentence?: string; content?: string }>;
      transcripts?: Array<{ text?: string }>;
    };
    const status = (pollPayload.output?.task_status ?? "").toUpperCase();
    if (status === "SUCCEEDED") {
      const transcriptionUrl = pollPayload.output?.result?.transcription_url;
      const payload = transcriptionUrl
        ? await fetchJson(transcriptionUrl)
        : pollPayload;
      const text = extractAsrText(payload);
      if (!text) {
        throw new Error("ASR 已完成，但未返回可用逐字稿");
      }
      return {
        language: "zh",
        text,
        raw: payload,
        sourceKind: "asr"
      };
    }
    if (status === "FAILED" || status === "UNKNOWN") {
      throw new Error(`ASR 转录失败，状态为 ${status}`);
    }
  }

  throw new Error("ASR 轮询超时");
}

export function resolveTranscriptRemoteSourceUrl(metadata: VideoMetadata): string | null {
  return metadata.remoteMediaUrl ?? pickRemoteAudioFormat(metadata.raw)?.url ?? extractRawUrl(metadata.raw);
}

export function getAsrSetupInstruction(configPath: string): string {
  return `未配置远程 ASR，请在 ${configPath} 中设置 asr.provider 和 asr.api_key。`;
}

function pickRemoteAudioFormat(raw: Record<string, unknown>): { url: string; http_headers?: Record<string, string> } | null {
  const formats = Array.isArray(raw.formats) ? raw.formats as Array<Record<string, unknown>> : [];
  const audioOnly = formats
    .filter((item) => item.acodec && item.acodec !== "none" && item.vcodec === "none" && typeof item.url === "string")
    .sort((left, right) => Number(right.abr ?? 0) - Number(left.abr ?? 0));
  const picked = audioOnly[0];
  if (picked?.url) {
    return {
      url: String(picked.url),
      http_headers: asStringRecord(picked.http_headers)
    };
  }
  return null;
}

function extractRawUrl(raw: Record<string, unknown>): string | null {
  return typeof raw.url === "string" ? raw.url : null;
}

function extractAsrText(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }
  const typed = payload as {
    transcripts?: Array<{ text?: string }>;
    output?: { results?: Array<{ text?: string; sentence?: string }> };
    segments?: Array<{ text?: string; sentence?: string; content?: string }>;
  };
  const transcriptText = (typed.transcripts ?? []).map((item) => item.text?.trim()).filter(Boolean).join("\n");
  if (transcriptText) {
    return transcriptText;
  }
  const outputText = (typed.output?.results ?? []).map((item) => item.text ?? item.sentence).filter(Boolean).join("\n");
  if (outputText) {
    return outputText;
  }
  return (typed.segments ?? []).map((item) => item.text ?? item.sentence ?? item.content).filter(Boolean).join("\n");
}

function isLlmConfigured(config: Awaited<ReturnType<typeof loadConfig>>): boolean {
  return Boolean(config.llm.enabled && config.llm.model && resolveApiKey(config.llm));
}

async function cleanupWithLlm(config: Awaited<ReturnType<typeof loadConfig>>, metadata: VideoMetadata, normalizedText: string): Promise<string> {
  const prompt = (await readPrompt("transcriptCleanup.md"))
    .replaceAll("{title}", metadata.title)
    .replaceAll("{platform}", metadata.platform)
    .replaceAll("{language}", "auto")
    .replaceAll("{raw_text}", normalizedText);
  const response = await completeWithLlm(config, prompt);
  return response.trim() || normalizedText;
}

async function translateWithLlm(config: Awaited<ReturnType<typeof loadConfig>>, text: string): Promise<string> {
  const prompt = (await readPrompt("translateText.md")).replaceAll("{text}", text);
  const response = await completeWithLlm(config, prompt);
  return response.trim();
}

async function completeWithLlm(config: Awaited<ReturnType<typeof loadConfig>>, prompt: string): Promise<string> {
  const apiKey = resolveApiKey(config.llm);
  if (!apiKey) {
    return "";
  }
  const response = await fetch(`${config.llm.base_url.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.llm.model || "gpt-4.1-mini",
      temperature: 0.2,
      messages: [
        { role: "user", content: prompt }
      ]
    })
  });
  if (!response.ok) {
    throw new Error(`LLM 请求失败: HTTP ${response.status}`);
  }
  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return stripCodeFence(payload.choices?.[0]?.message?.content ?? "");
}

function shouldTranslate(text: string): boolean {
  const asciiLetters = [...text].filter((char) => /[a-z]/i.test(char)).length;
  const cjkChars = [...text].filter((char) => /[\u4e00-\u9fff]/u.test(char)).length;
  return asciiLetters > 0 && asciiLetters >= cjkChars;
}

function stripCodeFence(text: string): string {
  const stripped = text.trim();
  if (stripped.startsWith("```") && stripped.endsWith("```")) {
    const lines = stripped.split("\n");
    return lines.slice(1, -1).join("\n").trim();
  }
  return stripped;
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`请求失败: ${response.status}`);
  }
  return response.json();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function asStringRecord(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string") {
      result[key] = entry;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}
