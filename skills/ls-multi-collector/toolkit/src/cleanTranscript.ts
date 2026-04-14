const COMMON_REPLACEMENTS: Record<string, string> = {
  "Open Cloud": "OpenClaw",
  "open claw": "OpenClaw",
  "open clock": "OpenClaw",
  "openclaw": "OpenClaw",
  "Qwen3ASR": "Qwen3-ASR",
  "qwen3ASR": "Qwen3-ASR",
  "qwen3asr": "Qwen3-ASR",
  "A R": "ASR",
  "M C P": "MCP",
  "S R T": "SRT"
};

const DIGITS: Record<string, number> = {
  "零": 0,
  "〇": 0,
  "○": 0,
  O: 0,
  "0": 0,
  "一": 1,
  "二": 2,
  "两": 2,
  "三": 3,
  "四": 4,
  "五": 5,
  "六": 6,
  "七": 7,
  "八": 8,
  "九": 9
};

export function cleanTranscript(text: string): string {
  let cleaned = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  cleaned = normalizeSubtitleLayout(cleaned);
  cleaned = cleaned.replace(/[ \t]+/g, " ");
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  cleaned = applyReplacements(cleaned);
  cleaned = normalizeTechnicalNumbers(cleaned);
  cleaned = removeNoiseFragments(cleaned);

  const sentences: string[] = [];
  for (const chunk of cleaned.split(/(?<=[。！？!?])/u)) {
    const trimmed = chunk.trim();
    if (!trimmed || shouldDropSentence(trimmed)) {
      continue;
    }
    const normalized = normalizeSentence(trimmed);
    if (sentences.at(-1) === normalized) {
      continue;
    }
    sentences.push(normalized);
  }

  const paragraphs: string[] = [];
  let current: string[] = [];
  for (const sentence of sentences) {
    current.push(sentence);
    if (current.length >= 3 || sentence.endsWith("：")) {
      paragraphs.push(joinSentences(current).trim());
      current = [];
    }
  }
  if (current.length > 0) {
    paragraphs.push(joinSentences(current).trim());
  }

  return paragraphs.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

function normalizeSubtitleLayout(text: string): string {
  let current = text.replace(/^\s*>>\s*/gm, "");
  current = current.replace(/(?<!\n)\n(?!\n)/g, " ");
  current = current.replace(/([\u4e00-\u9fff])\s+([\u4e00-\u9fff])/gu, "$1$2");
  current = current.replace(/([.!?])([A-Za-z0-9])/g, "$1 $2");
  current = current.replace(/([。！？])([A-Za-z0-9])/gu, "$1 $2");
  return current;
}

function applyReplacements(text: string): string {
  let current = text;
  for (const [oldValue, newValue] of Object.entries(COMMON_REPLACEMENTS)) {
    current = current.replaceAll(oldValue, newValue);
  }
  current = current.replace(/\b([A-Z])\s+([A-Z])\b/g, "$1$2");
  current = current.replace(/\b([A-Z]{2,})\s+([A-Z]{2,})\b/g, "$1$2");
  return current;
}

function removeNoiseFragments(text: string): string {
  return text
    .replaceAll("也就。也就是", "也就是")
    .replaceAll("然后。然后", "然后")
    .replaceAll("这里。现在这样的话", "现在这样的话")
    .replaceAll("当后。当后续", "当后续");
}

function normalizeTechnicalNumbers(text: string): string {
  let current = text;
  current = current.replace(/GPT\s*[四4]\s*[Oo零]/gi, "GPT-4o");
  current = current.replace(/Qwen\s*[三3]\s*[- ]?\s*ASR/gi, "Qwen3-ASR");
  current = current.replace(/Qwen\s*[三3]\s*[- ]?\s*Forced\s*Aligner/gi, "Qwen3-ForcedAligner");
  current = current.replace(/百分之([零一二三四五六七八九十百千万两点〇○O0-9]+)/gu, (_, token: string) => `${convertChineseNumberToken(token)}%`);
  current = current.replace(/(?<![%0-9A-Za-z])([零一二三四五六七八九十百千万两点〇○O0-9]+点[零一二三四五六七八九两〇○O0-9]+)/gu, (_, token: string) => convertChineseNumberToken(token));
  current = current.replace(/([零一二三四五六七八九十百千万两点〇○O0-9]+)\s*B\b/gu, (_, token: string) => `${convertChineseNumberToken(token)}B`);
  current = current.replace(/([零一二三四五六七八九十百千万两点〇○O0-9]+)\s*种/gu, (_, token: string) => ` ${convertChineseNumberToken(token)} 种`);
  current = current.replace(/([零一二三四五六七八九十百千万两点〇○O0-9]+)\s*分钟/gu, (_, token: string) => ` ${convertChineseNumberToken(token)} 分钟`);
  current = current.replace(/([零一二三四五六七八九十百千万两点〇○O0-9]+)\s*小时/gu, (_, token: string) => ` ${convertChineseNumberToken(token)} 小时`);
  current = current.replace(/二零([零一二三四五六七八九])([零一二三四五六七八九])点([零一二三四五六七八九十]+)点([零一二三四五六七八九十]+)/gu, (_, y1: string, y2: string, m: string, d: string) => `20${digit(y1)}${digit(y2)}.${convertChineseNumberToken(m)}.${convertChineseNumberToken(d)}`);
  current = current.replace(/(从)(\d+(?:\.\d+)?)/g, "$1 $2");
  current = current.replace(/(\d+(?:\.\d+)?%?)(降到|升到|到)/g, "$1 $2");
  current = current.replace(/(到|降到|升到|提升到|下降到)(\d+(?:\.\d+)?%?)/g, "$1 $2");
  return current;
}

function digit(value: string): string {
  return String(DIGITS[value] ?? value);
}

function convertChineseNumberToken(token: string): string {
  const normalized = token.trim();
  if (!normalized) {
    return normalized;
  }
  if (/^[0-9.]+$/.test(normalized)) {
    return normalized;
  }
  const sanitized = normalized.replaceAll("〇", "零").replaceAll("○", "零").replaceAll("O", "零");
  if (sanitized.includes("点")) {
    const [left, right] = sanitized.split("点", 2);
    return `${convertChineseInteger(left)}.${[...right].map((char) => digit(char)).join("")}`;
  }
  return String(convertChineseInteger(sanitized));
}

function convertChineseInteger(token: string): number {
  if (!token) {
    return 0;
  }
  if ([...token].every((char) => char in DIGITS)) {
    return Number([...token].map((char) => digit(char)).join(""));
  }
  const units: Record<string, number> = { 十: 10, 百: 100, 千: 1000, 万: 10000 };
  let total = 0;
  let current = 0;
  let number = 0;

  for (const char of token) {
    if (char in DIGITS) {
      number = DIGITS[char];
      continue;
    }
    if (!(char in units)) {
      continue;
    }
    const unit = units[char];
    if (unit === 10000) {
      current = (current + (number || 0)) * unit;
      total += current;
      current = 0;
      number = 0;
      continue;
    }
    current += (number || 1) * unit;
    number = 0;
  }

  return total + current + number;
}

function shouldDropSentence(sentence: string): boolean {
  const stripped = sentence.trim();
  if (["这里。", "然后。", "噗。", "嗯。", "啊。", "呃。"].includes(stripped)) {
    return true;
  }
  return stripped.length <= 2;
}

function normalizeSentence(sentence: string): string {
  return sentence
    .trim()
    .replace(/\s{2,}/g, " ");
}

function joinSentences(sentences: string[]): string {
  return sentences.reduce((joined, sentence) => {
    if (!joined) {
      return sentence;
    }
    if (needsSentenceSpace(joined, sentence)) {
      return `${joined} ${sentence}`;
    }
    return `${joined}${sentence}`;
  }, "");
}

function needsSentenceSpace(previous: string, next: string): boolean {
  return /[A-Za-z0-9.!?]"?$/.test(previous) && /^[A-Za-z0-9"'(]/.test(next);
}
