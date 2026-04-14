#!/usr/bin/env node

import { Command } from "commander";

import { downloadVideo } from "./downloadVideo.js";
import { transcriptVideo } from "./transcriptVideo.js";
import { fetchArticle } from "./fetchArticle.js";
import { runDoctor } from "./doctor.js";

const program = new Command();

program
  .name("ls-multi-collector")
  .description("LS Multi Collector toolkit");

program
  .command("download-video")
  .argument("<source>", "video URL or share text")
  .action(async (source) => {
    const result = await downloadVideo(source);
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command("transcript-video")
  .argument("<source>", "video URL or share text")
  .action(async (source) => {
    const result = await transcriptVideo(source);
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command("fetch-article")
  .argument("<source>", "article URL or share text")
  .action(async (source) => {
    const result = await fetchArticle(source);
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command("doctor")
  .action(async () => {
    const result = await runDoctor();
    console.log(JSON.stringify(result, null, 2));
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
