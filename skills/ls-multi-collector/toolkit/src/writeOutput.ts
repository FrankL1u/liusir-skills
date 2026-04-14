import path from "node:path";
import { promises as fs } from "node:fs";

export interface BundleOptions {
  outputRoot: string;
  action: string;
  platform: string;
  title: string;
}

export interface Bundle {
  dir: string;
  slug: string;
  createdAt: string;
}

export async function createBundle(options: BundleOptions): Promise<Bundle> {
  const createdAt = new Date().toISOString();
  const slug = buildSlug(options.title);
  const dirName = `${timestampToken(createdAt)}-${options.action}-${options.platform}-${slug}`;
  const dir = path.join(options.outputRoot, dirName);
  await fs.mkdir(dir, { recursive: true });
  return { dir, slug, createdAt };
}

export async function writeJsonFile(dir: string, fileName: string, value: unknown): Promise<string> {
  const target = path.join(dir, fileName);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return target;
}

export async function writeTextFile(dir: string, fileName: string, value: string): Promise<string> {
  const target = path.join(dir, fileName);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, value, "utf8");
  return target;
}

export async function copyArtifact(fromPath: string, toPath: string): Promise<string> {
  await fs.mkdir(path.dirname(toPath), { recursive: true });
  await fs.copyFile(fromPath, toPath);
  return toPath;
}

function timestampToken(value: string): string {
  return value.replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
}

function buildSlug(value: string): string {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64) || "untitled";
}
