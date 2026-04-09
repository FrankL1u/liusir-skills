import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_QWEN_MODEL, resolveImageSize } from "../src/image-gen.js";

test("series images should use 9:16 vertical sizing for every provider", () => {
  assert.equal(resolveImageSize("series", "gemini"), "9:16");
  assert.equal(resolveImageSize("series", "openai"), "1024x1792");
  assert.equal(resolveImageSize("series", "doubao"), "1024x1792");
  assert.equal(resolveImageSize("series", "qwen"), "1024*1792");
});

test("inline images should use the same 9:16 vertical sizing", () => {
  assert.equal(resolveImageSize("inline", "gemini"), "9:16");
  assert.equal(resolveImageSize("inline", "openai"), "1024x1792");
  assert.equal(resolveImageSize("inline", "doubao"), "1024x1792");
  assert.equal(resolveImageSize("inline", "qwen"), "1024*1792");
});

test("qwen should default to qwen-image-2.0 instead of the pro model", () => {
  assert.equal(DEFAULT_QWEN_MODEL, "qwen-image-2.0");
});
