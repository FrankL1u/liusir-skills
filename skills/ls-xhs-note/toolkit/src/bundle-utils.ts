import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export async function readText(filePath: string): Promise<string> {
  return readFile(filePath, "utf-8");
}

export function deriveSlug(content: string, fallback = "untitled-note"): string {
  const source = content
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0)
    ?.replace(/^#\s+/, "")
    .trim() || fallback;

  return source
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || fallback;
}

export async function ensureBundleDir(markdownPath: string, client: string, slug: string): Promise<string> {
  const notePath = path.resolve(markdownPath);
  const noteDir = path.dirname(notePath);
  if (path.basename(noteDir).endsWith(`-${slug}`) && path.basename(path.dirname(noteDir)) === client) {
    await mkdir(path.join(noteDir, "assets", "images"), { recursive: true });
    await mkdir(path.join(noteDir, "images"), { recursive: true });
    await mkdir(path.join(noteDir, "prompts"), { recursive: true });
    return noteDir;
  }

  const date = new Date().toISOString().slice(0, 10);
  const bundleDir = path.resolve(process.cwd(), "..", `output/${client}/${date}-${slug}`);
  await mkdir(path.join(bundleDir, "assets", "images"), { recursive: true });
  await mkdir(path.join(bundleDir, "images"), { recursive: true });
  await mkdir(path.join(bundleDir, "prompts"), { recursive: true });
  return bundleDir;
}

export async function writeJson(filePath: string, data: unknown): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}

export async function writeText(filePath: string, content: string): Promise<void> {
  await writeFile(filePath, `${content.trimEnd()}\n`, "utf-8");
}
