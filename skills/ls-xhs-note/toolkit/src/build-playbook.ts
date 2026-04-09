import { Command } from "commander";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { resolveRuntimeReadPath, resolveRuntimeWritePath } from "./runtime-paths.js";

const program = new Command();

program
  .requiredOption("--client <client>")
  .action(async (options) => {
    const corpusDir = resolveRuntimeReadPath(["clients", options.client, "corpus"]);
    const playbookPath = resolveRuntimeWritePath(["clients", options.client, "playbook.md"]);
    await mkdir(corpusDir, { recursive: true });
    const files = await readdir(corpusDir).catch(() => []);
    const content = [
      "# Client Playbook",
      "",
      `- Corpus files counted: ${files.length}`,
      "- Prefer short lead paragraphs with one concrete tension.",
      "- Use clear save-worthy packaging instead of article-like exposition.",
      "- End with one CTA only.",
    ].join("\n");
    await writeFile(playbookPath, `${content}\n`, "utf-8");
    console.log(playbookPath);
  });

await program.parseAsync(process.argv);
