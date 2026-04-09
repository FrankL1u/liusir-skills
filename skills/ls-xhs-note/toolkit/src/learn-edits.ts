import { Command } from "commander";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const program = new Command();

program
  .option("--client <client>")
  .option("--draft <draft>")
  .option("--final <final>")
  .option("--summarize")
  .action(async (options) => {
    if (options.summarize) {
      const summary = `Summarize repeated edit patterns for client ${options.client || "demo"}.`;
      console.log(summary);
      return;
    }

    if (!options.client || !options.draft || !options.final) {
      throw new Error("--client, --draft, and --final are required unless --summarize is used");
    }

    const draft = await readFile(options.draft, "utf-8");
    const final = await readFile(options.final, "utf-8");
    const lessonDir = path.resolve(process.cwd(), "..", `clients/${options.client}/lessons`);
    await mkdir(lessonDir, { recursive: true });
    const lessonPath = path.join(lessonDir, `${new Date().toISOString().replace(/[:.]/g, "-")}.md`);
    const content = [
      "# Edit Lesson",
      "",
      "## Draft Length",
      `${draft.length}`,
      "",
      "## Final Length",
      `${final.length}`,
      "",
      "## Observation",
      "- Compare the final note against the draft and capture repeated structural changes.",
    ].join("\n");
    await writeFile(lessonPath, `${content}\n`, "utf-8");
    console.log(lessonPath);
  });

await program.parseAsync(process.argv);
