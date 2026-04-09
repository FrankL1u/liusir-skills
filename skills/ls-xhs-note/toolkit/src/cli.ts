import { Command } from "commander";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { generateImageToFile } from "./image-gen.js";
import { deriveSlug, ensureBundleDir, readText, writeJson, writeText } from "./bundle-utils.js";

const STYLES = [
  "clean-grid",
  "study-board",
  "contrast-poster",
  "handwritten-flow",
  "hand-doodle",
  "tech-blueprint",
  "mascot-infographic",
  "bold-type",
];
const LAYOUTS = ["sparse", "balanced", "dense", "list", "comparison", "flow"];
const PRESETS: Record<string, { style: string; layout: string }> = {
  "knowledge-card": { style: "clean-grid", layout: "dense" },
  checklist: { style: "clean-grid", layout: "list" },
  tutorial: { style: "handwritten-flow", layout: "flow" },
  "study-guide": { style: "study-board", layout: "dense" },
  poster: { style: "contrast-poster", layout: "sparse" },
  editorial: { style: "contrast-poster", layout: "balanced" },
  "doodle-showdown": { style: "hand-doodle", layout: "comparison" },
  "blueprint-stack": { style: "tech-blueprint", layout: "dense" },
  "deep-dive-blueprint": { style: "tech-blueprint", layout: "balanced" },
  "mascot-lab": { style: "mascot-infographic", layout: "balanced" },
  "bold-statement": { style: "bold-type", layout: "sparse" },
  "mascot-checklist": { style: "mascot-infographic", layout: "list" },
};

type SeriesPlan = {
  markdownPath?: string;
  client?: string;
  slug?: string;
  preset?: string;
  style?: string;
  layout?: string;
  slides: Array<{
    type?: string;
    title?: string;
    prompt: string;
    promptPath?: string;
    outputPath?: string;
  }>;
};

const program = new Command();
program.name("ls-xhs-note");

program.command("styles").action(() => {
  for (const style of STYLES) {
    console.log(style);
  }
});

program.command("layouts").action(() => {
  for (const layout of LAYOUTS) {
    console.log(layout);
  }
});

program.command("presets").action(() => {
  console.log(JSON.stringify(PRESETS, null, 2));
});

program
  .command("preview")
  .argument("<markdownPath>")
  .option("--style <style>", "style key")
  .option("--layout <layout>", "layout key")
  .option("--preset <preset>", "preset key")
  .action(async (markdownPath, options) => {
    const resolvedPath = path.resolve(markdownPath);
    await readText(resolvedPath);
    const resolved = resolveVisualOptions(options.style, options.layout, options.preset);
    const sourceArticlePath = await detectSiblingFile(path.join(path.dirname(resolvedPath), "source-article.md"));
    const result = {
      markdownPath: resolvedPath,
      sourceArticlePath,
      style: resolved.style,
      layout: resolved.layout,
      preset: resolved.preset,
    };
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command("series")
  .argument("<planPath>")
  .option("--provider <provider>", "image provider", "")
  .option("--style <style>", "style key override")
  .option("--layout <layout>", "layout key override")
  .option("--preset <preset>", "preset override")
  .option("--yes", "non-interactive mode")
  .action(async (planPath, options) => {
    const planSourcePath = path.resolve(planPath);
    const plan = JSON.parse(await readFile(planSourcePath, "utf-8")) as SeriesPlan;
    const markdownPath = plan.markdownPath ? path.resolve(plan.markdownPath) : path.resolve(path.dirname(planPath), "note.md");
    const markdown = await readText(markdownPath);
    const slug = plan.slug || deriveSlug(markdown);
    const client = plan.client || inferClient(markdownPath) || "demo";
    const bundleDir = await ensureBundleDir(markdownPath, client, slug);
    const resolved = resolveVisualOptions(plan.style, plan.layout, plan.preset, {
      style: options.style,
      layout: options.layout,
      preset: options.preset,
    });

    await writeJson(path.join(bundleDir, "series-plan.json"), {
      ...plan,
      markdownPath,
      client,
      slug,
      style: resolved.style,
      layout: resolved.layout,
      preset: resolved.preset,
    });

    const sourceOutlinePath = path.join(path.dirname(planSourcePath), "series-outline.md");
    try {
      const outline = await readFile(sourceOutlinePath, "utf-8");
      await writeText(path.join(bundleDir, "series-outline.md"), outline);
    } catch {
      // outline is optional at the CLI layer
    }

    const slides = [];
    for (let index = 0; index < plan.slides.length; index += 1) {
      const slide = plan.slides[index]!;
      const slideType = normalizeSlideType(slide.type);
      const ordinal = `${String(index + 1).padStart(2, "0")}-${slideType}-${slug}`;
      const promptPath = slide.promptPath ? resolveAgainstBundle(bundleDir, slide.promptPath) : path.join(bundleDir, "prompts", `${ordinal}.md`);
      const outputPath = slide.outputPath ? resolveAgainstBundle(bundleDir, slide.outputPath) : path.join(bundleDir, "images", `${ordinal}.png`);

      await writeText(promptPath, slide.prompt);
      const result = await generateImageToFile({
        prompt: slide.prompt,
        output: outputPath,
        size: "series",
        provider: options.provider,
      });

      slides.push({
        index: index + 1,
        type: slideType,
        title: slide.title || "",
        style: resolved.style,
        layout: resolved.layout,
        preset: resolved.preset,
        promptPath: relativeBundlePath(bundleDir, promptPath),
        outputPath: relativeBundlePath(bundleDir, result.output),
        referenceImage: null,
        status: result.status,
        provider: result.provider,
        message: result.message || null,
      });

      if (index < plan.slides.length - 1) {
        await new Promise((resolveWait) => setTimeout(resolveWait, 5000));
      }
    }

    const manifest = {
      client,
      slug,
      markdownPath,
      generatedAt: new Date().toISOString(),
      style: resolved.style,
      layout: resolved.layout,
      preset: resolved.preset,
      nonInteractive: Boolean(options.yes),
      slides,
    };
    const manifestPath = path.join(bundleDir, "series-manifest.json");
    await writeJson(manifestPath, manifest);
    console.log(manifestPath);
  });

await program.parseAsync(process.argv);

function inferClient(markdownPath: string): string | null {
  const segments = path.resolve(markdownPath).split(path.sep);
  const outputIndex = segments.lastIndexOf("output");
  if (outputIndex >= 0 && segments.length > outputIndex + 1) {
    return segments[outputIndex + 1] || null;
  }
  return null;
}

async function detectSiblingFile(filePath: string): Promise<string | null> {
  try {
    await readFile(filePath, "utf-8");
    return filePath;
  } catch {
    return null;
  }
}

function resolveVisualOptions(
  style?: string,
  layout?: string,
  preset?: string,
  overrides?: { style?: string; layout?: string; preset?: string },
): { style: string; layout: string; preset: string | null } {
  const chosenPreset = overrides?.preset || preset || null;
  const presetMatch = chosenPreset ? PRESETS[chosenPreset] : undefined;
  return {
    style: overrides?.style || style || presetMatch?.style || "contrast-poster",
    layout: overrides?.layout || layout || presetMatch?.layout || "balanced",
    preset: chosenPreset,
  };
}

function resolveAgainstBundle(bundleDir: string, filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.join(bundleDir, filePath);
}

function relativeBundlePath(bundleDir: string, filePath: string): string {
  return path.relative(bundleDir, filePath) || path.basename(filePath);
}

function normalizeSlideType(value?: string): "content" | "ending" {
  return value === "ending" ? "ending" : "content";
}
